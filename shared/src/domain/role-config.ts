import type { EmployeeRole } from '../types/role.types.js';
import type { RoomType } from '../types/room.types.js';

export interface RoleConfig {
  /** What users see — never display raw role values. */
  label: string;
  /** Heading for a list of people with this role. */
  groupLabel: string;
  /** Area type holding this role's desk; also where they go if they have no desk. */
  defaultAreaType: RoomType;
  /** Display order, most senior first. */
  order: number;
}

/**
 * Single source of per-role behavior. Adding a role (e.g. DEVOPS) means one
 * `EmployeeRole` member plus one entry here — and a room of its
 * `defaultAreaType` on the floor plan if it gets its own area.
 * Roles never influence avatar appearance.
 */
export const ROLE_CONFIG: Readonly<Record<EmployeeRole, RoleConfig>> = {
  GENERAL_MANAGER: { label: 'General Manager', groupLabel: 'General Manager', defaultAreaType: 'MANAGEMENT', order: 0 },
  PROJECT_MANAGER: { label: 'Project Manager', groupLabel: 'Project Manager', defaultAreaType: 'PROJECT_MANAGEMENT', order: 1 },
  TEAM_LEAD: { label: 'Team Lead', groupLabel: 'Team Lead', defaultAreaType: 'TEAM_LEAD', order: 2 },
  DEVELOPER: { label: 'Developer', groupLabel: 'Developers', defaultAreaType: 'DEVELOPMENT', order: 3 },
  QA: { label: 'QA', groupLabel: 'QA Team', defaultAreaType: 'QA', order: 4 },
};

/** Every role, most senior first. */
export const EMPLOYEE_ROLES: readonly EmployeeRole[] = (Object.keys(ROLE_CONFIG) as EmployeeRole[]).sort(
  (a, b) => ROLE_CONFIG[a].order - ROLE_CONFIG[b].order,
);

export function isEmployeeRole(value: unknown): value is EmployeeRole {
  return typeof value === 'string' && Object.prototype.hasOwnProperty.call(ROLE_CONFIG, value);
}

export function roleLabel(role: EmployeeRole): string {
  return isEmployeeRole(role) ? ROLE_CONFIG[role].label : 'Team member';
}

export function roleOrder(role: EmployeeRole): number {
  return isEmployeeRole(role) ? ROLE_CONFIG[role].order : Number.MAX_SAFE_INTEGER;
}
