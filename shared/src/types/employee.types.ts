import type { UUID } from './common.types.js';
import type { EmployeeActivity } from './activity.types.js';
import type { PlayerPosition } from './navigation.types.js';
import type { EmployeePresence } from './presence.types.js';
import type { EmployeeRole } from './role.types.js';

/**
 * What an employee *does*, as opposed to what they may do (`role`). A
 * "Mobile Flutter Developer" in "Mobile Development" still has the
 * DEVELOPER role: the UI shows the job title, authorization keeps the role.
 */
export interface EmployeeProfileFields {
  /** Shown under the name ("Developer / Team Lead"). Null → the role's label. */
  jobTitle?: string | null;
  /** Organizational group ("Development", "QA", "Design"). Null → grouped by role. */
  team?: string | null;
  /** Optional specialism ("Flutter / Mobile Development"). */
  discipline?: string | null;
}

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
 *
 * Appearance is not part of this model: it lives in the employee's
 * `AvatarProfile` (one per employee, keyed by `employeeId`), so role and
 * look can never be coupled.
 */
export interface Employee extends EmployeeProfileFields {
  id: UUID;
  organizationId: UUID;
  displayName: string;
  /** Used to map external calendar attendees onto employees. */
  email?: string | null;
  /** Authorization role. What the person does is `jobTitle` (EmployeeProfileFields). */
  role: EmployeeRole;

  position: PlayerPosition;
  assignedDesk: EmployeeAssignedDesk | null;

  presence: EmployeePresence;
  activity: EmployeeActivity;
  room: EmployeeRoom;
  meeting?: EmployeeMeetingRef | null;
}
