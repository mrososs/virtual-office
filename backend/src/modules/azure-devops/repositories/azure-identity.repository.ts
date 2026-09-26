import { Injectable } from '@nestjs/common';
import type { UUID } from '@virtual-office/shared';
import { UNIQUE_VIOLATION, unwrap } from '../../../common/supabase/database.error';
import { SupabaseService } from '../../../common/supabase/supabase.service';
import type { AzureIdentityRef } from '../azure.types';

export type AzureIdentityMatch = 'VERIFIED_SIGN_IN' | 'EMAIL';

export interface AzureIdentityMapping {
  employeeId: UUID;
  azureIdentityId: string;
  azureDescriptor: string | null;
  azureUniqueName: string;
  azureDisplayName: string;
  matchMethod: AzureIdentityMatch;
}

interface Row {
  employee_id: string;
  azure_identity_id: string;
  azure_descriptor: string | null;
  azure_unique_name: string;
  azure_display_name: string;
  match_method: AzureIdentityMatch;
}

const toMapping = (row: Row): AzureIdentityMapping => ({
  employeeId: row.employee_id,
  azureIdentityId: row.azure_identity_id,
  azureDescriptor: row.azure_descriptor,
  azureUniqueName: row.azure_unique_name,
  azureDisplayName: row.azure_display_name,
  matchMethod: row.match_method,
});

/**
 * Virtual Office employee ↔ Azure DevOps identity. A verified mapping (from
 * the employee's own token) always wins over an email match and is never
 * overwritten by one.
 */
@Injectable()
export class AzureIdentityRepository {
  constructor(private readonly supabase: SupabaseService) {}

  private get table() {
    return this.supabase.client.from('azure_devops_identities');
  }

  async listAll(): Promise<AzureIdentityMapping[]> {
    const rows = unwrap(await this.table.select('*').returns<Row[]>(), 'azure_devops_identities.listAll');
    return (rows ?? []).map(toMapping);
  }

  /** The employee already linked to this Azure DevOps identity (the stable key; never the display name). */
  async findByIdentityId(azureIdentityId: string): Promise<AzureIdentityMapping | null> {
    const row = unwrap(await this.table.select('*').eq('azure_identity_id', azureIdentityId).maybeSingle<Row>(), 'azure_devops_identities.findByIdentityId');
    return row ? toMapping(row) : null;
  }

  async findByEmployee(employeeId: UUID): Promise<AzureIdentityMapping | null> {
    const row = unwrap(await this.table.select('*').eq('employee_id', employeeId).maybeSingle<Row>(), 'azure_devops_identities.findByEmployee');
    return row ? toMapping(row) : null;
  }

  /** Records the identity behind the employee's own delegated token; frees it from any stale email match first. */
  async saveVerified(employeeId: UUID, identity: AzureIdentityRef): Promise<void> {
    unwrap(await this.table.delete().eq('azure_identity_id', identity.id).neq('employee_id', employeeId), 'azure_devops_identities.releaseIdentity');
    unwrap(
      await this.table.upsert(
        {
          employee_id: employeeId,
          azure_identity_id: identity.id,
          azure_descriptor: identity.descriptor ?? null,
          azure_unique_name: identity.uniqueName,
          azure_display_name: identity.displayName,
          match_method: 'VERIFIED_SIGN_IN',
        },
        { onConflict: 'employee_id' },
      ),
      'azure_devops_identities.saveVerified',
    );
  }

  /** Adds an email match for an employee without any mapping yet. Silently skips identities already claimed. */
  async addEmailMatch(employeeId: UUID, identity: AzureIdentityRef): Promise<void> {
    const result = await this.table.insert({
      employee_id: employeeId,
      azure_identity_id: identity.id,
      azure_descriptor: identity.descriptor ?? null,
      azure_unique_name: identity.uniqueName,
      azure_display_name: identity.displayName,
      match_method: 'EMAIL',
    });
    if (result.error?.code === UNIQUE_VIOLATION) return;
    unwrap(result, 'azure_devops_identities.addEmailMatch');
  }
}
