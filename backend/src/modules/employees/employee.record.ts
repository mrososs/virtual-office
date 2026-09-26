import { isEmployeeRole, type EmployeeRole, type ISODateString, type UUID } from '@virtual-office/shared';

/** An `employees` row as the backend works with it (camelCase, validated role). */
export interface EmployeeRecord {
  id: UUID;
  entraObjectId: UUID | null;
  entraTenantId: UUID | null;
  email: string;
  displayName: string;
  role: EmployeeRole;
  /** What they do — display only; authorization uses `role`. */
  jobTitle: string | null;
  team: string | null;
  discipline: string | null;
  assignedDeskId: string | null;
  currentRoomId: string | null;
  isActive: boolean;
  createdAt: ISODateString;
  updatedAt: ISODateString;
  lastLoginAt: ISODateString | null;
}

/** Raw PostgREST shape of `public.employees`. */
export interface EmployeeRow {
  id: string;
  entra_object_id: string | null;
  entra_tenant_id: string | null;
  email: string;
  display_name: string;
  role: string;
  job_title: string | null;
  team: string | null;
  discipline: string | null;
  assigned_desk_id: string | null;
  current_room_id: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  last_login_at: string | null;
}

export const EMPLOYEE_COLUMNS =
  'id, entra_object_id, entra_tenant_id, email, display_name, role, job_title, team, discipline, assigned_desk_id, current_room_id, is_active, created_at, updated_at, last_login_at';

export function toEmployeeRecord(row: EmployeeRow): EmployeeRecord {
  // The table has a CHECK constraint; this guards against a role added in SQL before the code knows it.
  const role: EmployeeRole = isEmployeeRole(row.role) ? row.role : 'DEVELOPER';
  return {
    id: row.id,
    entraObjectId: row.entra_object_id,
    entraTenantId: row.entra_tenant_id,
    email: row.email,
    displayName: row.display_name,
    role,
    jobTitle: row.job_title,
    team: row.team,
    discipline: row.discipline,
    assignedDeskId: row.assigned_desk_id,
    currentRoomId: row.current_room_id,
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    lastLoginAt: row.last_login_at,
  };
}

/** Emails are stored trimmed + lowercased (enforced by a CHECK constraint). */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}
