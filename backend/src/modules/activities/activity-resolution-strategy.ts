import { Inject, Injectable, Optional } from '@nestjs/common';
import type { ActivityType } from '@virtual-office/shared';

/**
 * Contract for turning a set of candidate activity types (each backed by at
 * least one current `ActivitySignal`) into a single winning `ActivityType`.
 * Kept as an interface so alternate strategies (per-organization overrides,
 * ML-ranked resolution, etc.) can be swapped in via DI later.
 */
export interface ActivityResolutionStrategy {
  /**
   * Given the distinct activity types currently signaled for an employee,
   * returns the one that should win.
   */
  resolve(candidateTypes: ActivityType[]): ActivityType;
}

/** DI token for `ActivityResolutionStrategy` (interfaces have no runtime identity). */
export const ACTIVITY_RESOLUTION_STRATEGY = Symbol('ACTIVITY_RESOLUTION_STRATEGY');

/** DI token for the ordered priority list consumed by `DefaultActivityResolutionStrategy`. */
export const ACTIVITY_PRIORITY_CONFIG = Symbol('ACTIVITY_PRIORITY_CONFIG');

/**
 * Priority is DATA, not a scattered if/else chain: this ordered list is the
 * single place that encodes "MEETING beats BLOCKED beats CODE_REVIEW...".
 * Reordering business priority means editing this array (or supplying a
 * different `ACTIVITY_PRIORITY_CONFIG` provider per organization later),
 * not hunting through services for hardcoded comparisons.
 */
export const DEFAULT_ACTIVITY_PRIORITY: ActivityType[] = [
  'MEETING',
  'BLOCKED',
  'CODE_REVIEW',
  'BUILDING',
  'CODING',
  'WORKING',
  'FOCUS',
  'BREAK',
  'AVAILABLE',
  'UNKNOWN',
  'OFFLINE',
];

@Injectable()
export class DefaultActivityResolutionStrategy implements ActivityResolutionStrategy {
  constructor(
    @Optional()
    @Inject(ACTIVITY_PRIORITY_CONFIG)
    private readonly priority: ActivityType[] = DEFAULT_ACTIVITY_PRIORITY,
  ) {}

  resolve(candidateTypes: ActivityType[]): ActivityType {
    if (candidateTypes.length === 0) {
      return 'UNKNOWN';
    }

    for (const type of this.priority) {
      if (candidateTypes.includes(type)) {
        return type;
      }
    }

    // Fallback for a candidate type not present in the configured priority list.
    return candidateTypes[0];
  }
}
