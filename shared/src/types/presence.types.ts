import type { ISODateString } from './common.types.js';

/**
 * Presence answers ONLY "is this person's client connected right now".
 * It must never be inferred from work-tool activity (Azure DevOps, Teams, etc).
 * See ActivityState in activity.types.ts for what the employee is *doing*.
 */
export type PresenceStatus = 'ONLINE' | 'AWAY' | 'OFFLINE';

export interface EmployeePresence {
  status: PresenceStatus;
  lastSeenAt: ISODateString | null;
  connectedSocketId?: string | null;
}
