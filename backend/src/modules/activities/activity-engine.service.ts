import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import type { ActivitySignal, ActivitySource, EmployeeActivity, EmployeeActivityChangedPayload, UUID } from '@virtual-office/shared';
import { Subject, type Observable } from 'rxjs';
import { ActivityResolver } from './activity-resolver';

/** Re-resolves everyone this often so expiring signals change what the office shows. */
const EXPIRY_SWEEP_MS = 60_000;

/**
 * Entry point for all activity-related writes. `azure-devops/` (scheduled
 * sync), `webhooks/` and later `microsoft/` map their raw external data to
 * `ActivitySignal`s and hand them here — they never write `EmployeeActivity`
 * directly, and no source knows about any other: conflicts (e.g. a Teams
 * MEETING vs an Azure WORKING) are settled by the resolution strategy.
 *
 * Activity is derived work-tool state; it is NOT presence. Never use this
 * engine's output to set `EmployeePresence` (see `modules/presence`).
 *
 * State is in memory (single backend instance). Azure signals are rebuilt from
 * the persisted `azure_*` tables at startup, so a restart loses nothing.
 */
@Injectable()
export class ActivityEngine implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ActivityEngine.name);
  private readonly signalsByEmployee = new Map<UUID, ActivitySignal[]>();
  private readonly resolvedByEmployee = new Map<UUID, EmployeeActivity>();
  private readonly changes = new Subject<EmployeeActivityChangedPayload>();
  private sweepTimer: NodeJS.Timeout | null = null;

  /** Fires only when an employee's resolved activity actually changes (the realtime gateway broadcasts it). */
  readonly changes$: Observable<EmployeeActivityChangedPayload> = this.changes.asObservable();

  constructor(private readonly resolver: ActivityResolver) {}

  onModuleInit(): void {
    this.sweepTimer = setInterval(() => this.sweepExpired(), EXPIRY_SWEEP_MS);
    this.sweepTimer.unref();
  }

  onModuleDestroy(): void {
    if (this.sweepTimer) clearInterval(this.sweepTimer);
    this.changes.complete();
  }

  /** Records one raw signal (e.g. a Service Hook event), replacing an earlier signal with the same id. */
  async ingestSignal(signal: ActivitySignal): Promise<void> {
    const existing = (this.signalsByEmployee.get(signal.employeeId) ?? []).filter((candidate) => candidate.id !== signal.id);
    this.signalsByEmployee.set(signal.employeeId, [...existing, signal]);
    this.logger.debug(`Ingested ${signal.source}/${signal.type} signal for employee ${signal.employeeId}`);
    this.recompute(signal.employeeId);
  }

  /**
   * Replaces everything one source currently says with a fresh full picture
   * (a scheduled sync). Employees absent from `signalsByEmployee` lose that
   * source's signals; other sources are untouched.
   */
  replaceSource(source: ActivitySource, signalsByEmployee: ReadonlyMap<UUID, ActivitySignal[]>): void {
    const affected = new Set<UUID>(signalsByEmployee.keys());
    for (const [employeeId, signals] of this.signalsByEmployee) {
      if (signals.some((signal) => signal.source === source)) affected.add(employeeId);
    }
    for (const employeeId of affected) {
      const others = (this.signalsByEmployee.get(employeeId) ?? []).filter((signal) => signal.source !== source);
      this.signalsByEmployee.set(employeeId, [...others, ...(signalsByEmployee.get(employeeId) ?? [])]);
      this.recompute(employeeId);
    }
  }

  /** The current resolved activity (Available when nothing is known). */
  resolveForEmployee(employeeId: UUID): EmployeeActivity {
    return this.resolvedByEmployee.get(employeeId) ?? this.resolver.resolve(this.signalsByEmployee.get(employeeId) ?? []);
  }

  private recompute(employeeId: UUID): void {
    const next = this.resolver.resolve(this.signalsByEmployee.get(employeeId) ?? []);
    const previous = this.resolvedByEmployee.get(employeeId);
    if (previous && sameActivity(previous, next)) return;
    this.resolvedByEmployee.set(employeeId, next);
    this.changes.next({ employeeId, activity: next });
  }

  private sweepExpired(): void {
    const now = Date.now();
    for (const [employeeId, signals] of this.signalsByEmployee) {
      const live = signals.filter((signal) => !signal.expiresAt || new Date(signal.expiresAt).getTime() > now);
      if (live.length === signals.length) continue;
      this.signalsByEmployee.set(employeeId, live);
      this.recompute(employeeId);
    }
  }
}

function sameActivity(a: EmployeeActivity, b: EmployeeActivity): boolean {
  return (
    a.type === b.type &&
    a.source === b.source &&
    a.title === b.title &&
    a.workItemId === b.workItemId &&
    a.pullRequestId === b.pullRequestId &&
    a.buildId === b.buildId
  );
}
