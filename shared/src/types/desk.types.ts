import type { UUID, Vector2 } from './common.types.js';

/**
 * A desk assignment is independent from the employee's current avatar
 * position — an employee can leave their desk and roam the office while
 * still "owning" it.
 */
export interface Desk {
  id: UUID;
  officeId: UUID;
  employeeId: UUID | null;
  position: Vector2;
  rotation?: number;
  type: 'STANDARD' | 'STANDING' | 'SHARED';
}
