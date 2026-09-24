import type { UUID, ISODateString } from '@virtual-office/shared';

/**
 * A platform user account (credentials, auth identity). Deliberately
 * separate from the shared `Employee` domain type: a `User` is "who can log
 * in", an `Employee` is "who appears as an avatar in the office". Most users
 * will have exactly one linked employee, but the two ids are not the same
 * concept and must not be conflated.
 */
export interface User {
  id: UUID;
  organizationId: UUID;
  email: string;
  employeeId: UUID | null;
  passwordHash: string | null;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}
