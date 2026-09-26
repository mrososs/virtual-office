import type { EmployeeProfileFields } from '../types/employee.types.js';
import type { EmployeeRole } from '../types/role.types.js';
import { ROLE_CONFIG, isEmployeeRole, roleLabel, roleOrder } from './role-config.js';

type Describable = EmployeeProfileFields & { role?: EmployeeRole | null };

/** The line under someone's name: their job title, or their role's label when none is set. */
export function employeeTitle(employee: Describable): string {
  return employee.jobTitle?.trim() || (employee.role ? roleLabel(employee.role) : 'Team member');
}

/** "Developer / Team Lead · Development": the title, followed by the team when it adds something. */
export function employeeTitleWithTeam(employee: Describable): string {
  const title = employeeTitle(employee);
  const team = employee.team?.trim();
  return team && team !== title ? `${title} · ${team}` : title;
}

/** The heading someone is listed under: their team, or their role's group when none is set. */
export function employeeGroupLabel(employee: Describable): string {
  return employee.team?.trim() || (isEmployeeRole(employee.role) ? ROLE_CONFIG[employee.role].groupLabel : 'Team');
}

/** True when a teammate search term matches the person's name, title, team, discipline or role. */
export function matchesEmployeeSearch(employee: Describable & { displayName: string }, term: string): boolean {
  const needle = term.trim().toLowerCase();
  if (!needle) return true;
  return [employee.displayName, employeeTitle(employee), employee.team, employee.discipline, employee.role ? roleLabel(employee.role) : null].some(
    (field) => field?.toLowerCase().includes(needle),
  );
}

export interface EmployeeGroup<T> {
  label: string;
  members: T[];
}

/**
 * Groups people by team, keeping each group's members in the given order.
 * Groups are ordered by their most senior role across the whole `roster`
 * (so filtering never reshuffles headings), then alphabetically. Without
 * teams this is exactly one group per role, most senior first.
 */
export function groupEmployeesByTeam<T extends Describable>(members: readonly T[], roster: readonly Describable[] = members): EmployeeGroup<T>[] {
  const rank = new Map<string, number>();
  for (const employee of roster) {
    const label = employeeGroupLabel(employee);
    rank.set(label, Math.min(rank.get(label) ?? Number.MAX_SAFE_INTEGER, employee.role ? roleOrder(employee.role) : Number.MAX_SAFE_INTEGER));
  }
  const groups = new Map<string, T[]>();
  for (const employee of members) {
    const label = employeeGroupLabel(employee);
    groups.set(label, [...(groups.get(label) ?? []), employee]);
  }
  const rankOf = (label: string) => rank.get(label) ?? Number.MAX_SAFE_INTEGER;
  return [...groups]
    .map(([label, list]) => ({ label, members: list }))
    .sort((a, b) => rankOf(a.label) - rankOf(b.label) || a.label.localeCompare(b.label));
}
