import type { AuthMeResponse, EmployeeProfileFields, EmployeeRole, UUID } from '@virtual-office/shared';

/**
 * The signed-in person as the UI uses them (from `/api/auth/me`, or a demo
 * identity). Never holds provider tokens. `role` authorizes; `jobTitle` /
 * `team` describe the person in the UI.
 */
export interface CurrentUser extends EmployeeProfileFields {
  employeeId: UUID;
  organizationId: UUID;
  displayName: string;
  email: string;
  role?: EmployeeRole;
}

/** Why the session could not be checked (as opposed to "not signed in"). */
export type SessionProblem = 'backend_unreachable' | 'database_unavailable' | 'error';

export type SessionLookup =
  | { status: 'authenticated'; me: AuthMeResponse }
  | { status: 'anonymous' }
  | { status: 'unavailable'; problem: SessionProblem };
