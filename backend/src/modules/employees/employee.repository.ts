import { Injectable } from '@nestjs/common';
import type { UUID } from '@virtual-office/shared';
import { UNIQUE_VIOLATION, unwrap, unwrapRow } from '../../common/supabase/database.error';
import { SupabaseService } from '../../common/supabase/supabase.service';
import { EMPLOYEE_COLUMNS, normalizeEmail, toEmployeeRecord, type EmployeeRecord, type EmployeeRow } from './employee.record';

/**
 * The only code that queries `public.employees`. Identity-linking writes are
 * conditional (`... where entra_object_id is null`) so two concurrent first
 * sign-ins can never link one employee to two Microsoft accounts.
 */
@Injectable()
export class EmployeeRepository {
  constructor(private readonly supabase: SupabaseService) {}

  private get table() {
    return this.supabase.client.from('employees');
  }

  async findById(id: UUID): Promise<EmployeeRecord | null> {
    const row = unwrap(await this.table.select(EMPLOYEE_COLUMNS).eq('id', id).maybeSingle<EmployeeRow>(), 'employees.findById');
    return row ? toEmployeeRecord(row) : null;
  }

  async findByEntraIdentity(tenantId: UUID, objectId: UUID): Promise<EmployeeRecord | null> {
    const row = unwrap(
      await this.table.select(EMPLOYEE_COLUMNS).eq('entra_tenant_id', tenantId).eq('entra_object_id', objectId).maybeSingle<EmployeeRow>(),
      'employees.findByEntraIdentity',
    );
    return row ? toEmployeeRecord(row) : null;
  }

  async findByEmail(email: string): Promise<EmployeeRecord | null> {
    const row = unwrap(
      await this.table.select(EMPLOYEE_COLUMNS).eq('email', normalizeEmail(email)).maybeSingle<EmployeeRow>(),
      'employees.findByEmail',
    );
    return row ? toEmployeeRecord(row) : null;
  }

  async listActive(): Promise<EmployeeRecord[]> {
    const rows = unwrap(await this.table.select(EMPLOYEE_COLUMNS).eq('is_active', true).order('display_name').returns<EmployeeRow[]>(), 'employees.listActive');
    return (rows ?? []).map(toEmployeeRecord);
  }

  /** Links a pre-approved employee to a Microsoft identity. Null when another sign-in linked them first. */
  async linkEntraIdentity(id: UUID, tenantId: UUID, objectId: UUID): Promise<EmployeeRecord | null> {
    const result = await this.table
      .update({ entra_tenant_id: tenantId, entra_object_id: objectId })
      .eq('id', id)
      .is('entra_object_id', null)
      .select(EMPLOYEE_COLUMNS)
      .maybeSingle<EmployeeRow>();
    if (result.error?.code === UNIQUE_VIOLATION) return null;
    const row = unwrap(result, 'employees.linkEntraIdentity');
    return row ? toEmployeeRecord(row) : null;
  }

  /**
   * Stamps a successful sign-in and refreshes the name/email Microsoft reports.
   * Email is best-effort: if another row already uses it, the stored one stays.
   */
  async recordSignIn(id: UUID, profile: { displayName: string | null; email: string | null }): Promise<EmployeeRecord> {
    const base: Record<string, unknown> = { last_login_at: new Date().toISOString() };
    if (profile.displayName?.trim()) base.display_name = profile.displayName.trim();

    if (profile.email) {
      const withEmail = await this.table
        .update({ ...base, email: normalizeEmail(profile.email) })
        .eq('id', id)
        .select(EMPLOYEE_COLUMNS)
        .single<EmployeeRow>();
      if (withEmail.error?.code !== UNIQUE_VIOLATION) return toEmployeeRecord(unwrapRow(withEmail, 'employees.recordSignIn'));
    }
    return toEmployeeRecord(unwrapRow(await this.table.update(base).eq('id', id).select(EMPLOYEE_COLUMNS).single<EmployeeRow>(), 'employees.recordSignIn'));
  }

  async listAssignedDeskIds(): Promise<Set<string>> {
    const rows = unwrap(
      await this.table.select('assigned_desk_id').not('assigned_desk_id', 'is', null).returns<Array<{ assigned_desk_id: string }>>(),
      'employees.listAssignedDeskIds',
    );
    return new Set((rows ?? []).map((row) => row.assigned_desk_id));
  }

  /** Gives a deskless employee a desk. Null when they got one meanwhile or the desk was just taken. */
  async assignDesk(id: UUID, deskId: string): Promise<EmployeeRecord | null> {
    const result = await this.table
      .update({ assigned_desk_id: deskId })
      .eq('id', id)
      .is('assigned_desk_id', null)
      .select(EMPLOYEE_COLUMNS)
      .maybeSingle<EmployeeRow>();
    if (result.error?.code === UNIQUE_VIOLATION) return null;
    const row = unwrap(result, 'employees.assignDesk');
    return row ? toEmployeeRecord(row) : null;
  }
}
