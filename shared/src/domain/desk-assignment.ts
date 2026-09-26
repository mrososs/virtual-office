import type { Bounds, UUID, Vector2 } from '../types/common.types.js';
import type { Desk } from '../types/desk.types.js';
import type { EmployeeRole } from '../types/role.types.js';
import type { Room } from '../types/room.types.js';

import { ROLE_CONFIG } from './role-config.js';

export interface DeskAssignee {
  id: UUID;
  role: EmployeeRole;
}

/**
 * Gives every employee without a desk the first free desk in their role's
 * default area (`ROLE_CONFIG[role].defaultAreaType`). Existing assignments
 * are kept, and the result only depends on input order, so seeding is
 * deterministic. People whose area has no free desk simply stay deskless
 * (placement then falls back to their role's area).
 */
export function assignDesksByRole(employees: readonly DeskAssignee[], desks: readonly Desk[], rooms: readonly Room[]): Map<UUID, UUID> {
  const assignment = new Map<UUID, UUID>();
  const taken = new Set<UUID>();
  for (const desk of desks) {
    if (!desk.employeeId) continue;
    assignment.set(desk.employeeId, desk.id);
    taken.add(desk.id);
  }

  for (const employee of employees) {
    if (assignment.has(employee.id)) continue;
    const areaType = ROLE_CONFIG[employee.role]?.defaultAreaType;
    const areas = rooms.filter((room) => room.type === areaType);
    const desk = desks.find((candidate) => !taken.has(candidate.id) && areas.some((room) => contains(room.bounds, candidate.position)));
    if (!desk) continue;
    assignment.set(employee.id, desk.id);
    taken.add(desk.id);
  }
  return assignment;
}

function contains(bounds: Bounds, point: Vector2): boolean {
  return point.x >= bounds.x && point.x <= bounds.x + bounds.width && point.y >= bounds.y && point.y <= bounds.y + bounds.height;
}
