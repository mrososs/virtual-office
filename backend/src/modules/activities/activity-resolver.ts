import { Inject, Injectable } from '@nestjs/common';
import type { ActivitySignal, EmployeeActivity } from '@virtual-office/shared';
import {
  ACTIVITY_RESOLUTION_STRATEGY,
  ActivityResolutionStrategy,
} from './activity-resolution-strategy';

/**
 * Pure(ish) resolver: `ActivitySignal[]` -> single `EmployeeActivity`.
 * Delegates the "which type wins" decision to an injected
 * `ActivityResolutionStrategy` so this class stays about *how* signals are
 * combined (filtering expired ones, picking a representative signal for the
 * winning type) rather than *what* the priority order is.
 *
 * `ActivityResolutionStrategy` is an interface, so it's wired via the
 * `ACTIVITY_RESOLUTION_STRATEGY` DI token (see `activities.module.ts`)
 * rather than by concrete class — swap strategies there, not here.
 */
@Injectable()
export class ActivityResolver {
  constructor(
    @Inject(ACTIVITY_RESOLUTION_STRATEGY)
    private readonly strategy: ActivityResolutionStrategy,
  ) {}

  resolve(signals: ActivitySignal[]): EmployeeActivity {
    const now = Date.now();
    const active = signals.filter((signal) => !signal.expiresAt || new Date(signal.expiresAt).getTime() > now);

    if (active.length === 0) {
      return {
        type: 'UNKNOWN',
        source: 'SYSTEM',
        confidence: 0,
        updatedAt: new Date().toISOString(),
      };
    }

    const candidateTypes = [...new Set(active.map((signal) => signal.type))];
    const winningType = this.strategy.resolve(candidateTypes);

    // TODO: when multiple signals share the winning type, pick the one with
    // highest confidence / most recent `occurredAt` rather than the first match.
    const winningSignal = active.find((signal) => signal.type === winningType) ?? active[0];

    return {
      type: winningType,
      source: winningSignal.source,
      title: winningSignal.title,
      workItemId: winningSignal.workItemId,
      confidence: winningSignal.confidence,
      updatedAt: new Date().toISOString(),
    };
  }
}
