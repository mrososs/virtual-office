import type { ISODateString, UUID } from './common.types.js';

/**
 * What the employee appears to be *doing*, derived from work-tool signals.
 * Deliberately independent from EmployeePresence — Azure DevOps activity is
 * never proof that someone is physically at their machine.
 */
export type ActivityType =
  | 'AVAILABLE'
  | 'WORKING'
  | 'CODING'
  | 'CODE_REVIEW'
  | 'BUILDING'
  | 'TESTING'
  | 'BLOCKED'
  | 'MEETING'
  | 'FOCUS'
  | 'BREAK'
  | 'OFFLINE'
  | 'UNKNOWN';

export type ActivitySource =
  | 'AZURE_DEVOPS'
  | 'MICROSOFT_TEAMS'
  | 'MANUAL'
  | 'SYSTEM';

/**
 * How much the ActivityEngine trusts a given signal when resolving conflicts.
 * 0 = purely speculative, 1 = certain (e.g. user manually set status).
 */
export type ActivityConfidence = number;

/**
 * A single raw observation from a source, before resolution.
 * e.g. "Azure DevOps says this employee is assigned an active PR review".
 */
export interface ActivitySignal {
  id: UUID;
  employeeId: UUID;
  source: ActivitySource;
  type: ActivityType;
  confidence: ActivityConfidence;
  title?: string;
  /** Internal `WorkItem.id` / `PullRequest.id` / `Build.id` the signal is about, copied onto the resolved activity. */
  workItemId?: string;
  pullRequestId?: string;
  buildId?: string;
  occurredAt: ISODateString;
  expiresAt?: ISODateString | null;
}

/**
 * The resolved, single-value activity state attached to an employee after
 * ActivityResolutionStrategy has weighed all current signals.
 */
export interface EmployeeActivity {
  type: ActivityType;
  source: ActivitySource;
  title?: string;
  /** Internal `WorkItem.id` / `PullRequest.id` / `Build.id` the activity refers to, when known. */
  workItemId?: string;
  pullRequestId?: string;
  buildId?: string;
  confidence: ActivityConfidence;
  updatedAt: ISODateString;
}
