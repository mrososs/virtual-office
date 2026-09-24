import type { UUID } from './common.types.js';
import type { EmployeeActivity } from './activity.types.js';
import type { PlayerPosition } from './navigation.types.js';
import type { EmployeePresence } from './presence.types.js';

export interface EmployeeAssignedDesk {
  deskId: UUID;
  x: number;
  y: number;
}

export interface EmployeeRoom {
  roomId: UUID | null;
  roomType: string | null;
}

export interface EmployeeMeetingRef {
  meetingId: UUID;
  roomId: UUID | null;
}

/**
 * Core employee domain model. `presence` and `activity` are intentionally
 * separate fields — never derive one from the other. See presence.types.ts
 * and activity.types.ts for the reasoning.
 */
export interface Employee {
  id: UUID;
  organizationId: UUID;
  displayName: string;
  /** Used to map external calendar attendees onto employees. */
  email?: string | null;
  avatarUrl?: string | null;
  jobTitle?: string | null;
  teamId?: UUID | null;

  position: PlayerPosition;
  assignedDesk: EmployeeAssignedDesk | null;

  presence: EmployeePresence;
  activity: EmployeeActivity;
  room: EmployeeRoom;
  meeting?: EmployeeMeetingRef | null;
}
