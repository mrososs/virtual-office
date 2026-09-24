import { Injectable, Logger } from '@nestjs/common';
import type { ActivitySignal, EmployeeActivity, UUID } from '@virtual-office/shared';
import { ActivityResolver } from './activity-resolver';

/**
 * Entry point for all activity-related writes. `webhooks/`, `azure-devops/`,
 * and `microsoft/` map their raw external payloads to `ActivitySignal`s and
 * hand them to `ingestSignal` — they never write `EmployeeActivity` directly.
 *
 * Activity is derived work-tool state; it is NOT presence. Never use this
 * engine's output to set `EmployeePresence` (see `modules/presence`).
 */
@Injectable()
export class ActivityEngine {
  private readonly logger = new Logger(ActivityEngine.name);

  // TODO: replace with a persisted/cached store (Supabase table or Redis)
  // keyed by employeeId, with signal expiry handled by TTL rather than an
  // in-memory Map.
  private readonly signalsByEmployee = new Map<UUID, ActivitySignal[]>();

  constructor(private readonly resolver: ActivityResolver) {}

  /** Records a new raw signal for an employee (e.g. "PR review requested"). */
  async ingestSignal(signal: ActivitySignal): Promise<void> {
    const existing = this.signalsByEmployee.get(signal.employeeId) ?? [];
    this.signalsByEmployee.set(signal.employeeId, [...existing, signal]);

    this.logger.debug(`Ingested ${signal.source}/${signal.type} signal for employee ${signal.employeeId}`);

    // TODO: after storing, call resolveForEmployee and, if the resolved
    // activity changed, broadcast SOCKET_EVENTS.EMPLOYEE_ACTIVITY_CHANGED
    // via RealtimeModule.
  }

  /** Resolves the current signals for an employee into one `EmployeeActivity`. */
  async resolveForEmployee(employeeId: UUID): Promise<EmployeeActivity> {
    const signals = this.signalsByEmployee.get(employeeId) ?? [];
    return this.resolver.resolve(signals);
  }
}
