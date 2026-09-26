import { Injectable } from '@nestjs/common';
import type { AzureDevOpsCredentialType, UUID } from '@virtual-office/shared';
import { unwrap } from '../../../common/supabase/database.error';
import { SupabaseService } from '../../../common/supabase/supabase.service';

export type AzureConnectionState = 'CONNECTED' | 'EXPIRED' | 'INVALID' | 'ERROR' | 'DISCONNECTED';

export interface AzureConnection {
  employeeId: UUID;
  credentialType: AzureDevOpsCredentialType;
  status: AzureConnectionState;
  /** AES-256-GCM sealed PAT — only `AzureCredentialService` opens it; never leaves the backend. */
  encryptedPat: string | null;
  patExpiresAt: string | null;
  organization: string | null;
  project: string | null;
  connectedAt: string;
  lastVerifiedAt: string | null;
  lastSyncAt: string | null;
  lastError: string | null;
}

interface Row {
  employee_id: string;
  credential_type: AzureDevOpsCredentialType;
  status: AzureConnectionState;
  encrypted_pat: string | null;
  pat_expires_at: string | null;
  organization: string | null;
  project: string | null;
  connected_at: string;
  last_verified_at: string | null;
  last_sync_at: string | null;
  last_error: string | null;
}

const toConnection = (row: Row): AzureConnection => ({
  employeeId: row.employee_id,
  credentialType: row.credential_type,
  status: row.status,
  encryptedPat: row.encrypted_pat,
  patExpiresAt: row.pat_expires_at,
  organization: row.organization,
  project: row.project,
  connectedAt: row.connected_at,
  lastVerifiedAt: row.last_verified_at,
  lastSyncAt: row.last_sync_at,
  lastError: row.last_error,
});

export interface SavedCredential {
  status: AzureConnectionState;
  lastError: string | null;
  organization: string;
  project: string | null;
}

/**
 * Each employee's Azure DevOps credential and its health (one row per
 * employee). The scheduled sync picks a healthy one; the credential kind (PAT
 * now, Entra later) is just a column.
 */
@Injectable()
export class AzureConnectionRepository {
  constructor(private readonly supabase: SupabaseService) {}

  private get table() {
    return this.supabase.client.from('azure_devops_connections');
  }

  async find(employeeId: UUID): Promise<AzureConnection | null> {
    const row = unwrap(await this.table.select('*').eq('employee_id', employeeId).maybeSingle<Row>(), 'azure_devops_connections.find');
    return row ? toConnection(row) : null;
  }

  /** Healthy connections, most recently verified first — the sync tries them in this order. */
  async listUsable(): Promise<AzureConnection[]> {
    const rows = unwrap(
      await this.table.select('*').eq('status', 'CONNECTED').order('last_verified_at', { ascending: false, nullsFirst: false }).returns<Row[]>(),
      'azure_devops_connections.listUsable',
    );
    return (rows ?? []).map(toConnection);
  }

  /** Stores (or replaces) an employee's PAT, already sealed by the caller. */
  async savePat(employeeId: UUID, encryptedPat: string, patExpiresAt: string | null, saved: SavedCredential): Promise<void> {
    const now = new Date().toISOString();
    unwrap(
      await this.table.upsert(
        {
          employee_id: employeeId,
          credential_type: 'PAT',
          encrypted_pat: encryptedPat,
          pat_expires_at: patExpiresAt,
          organization: saved.organization,
          project: saved.project,
          status: saved.status,
          last_error: saved.lastError,
          connected_at: now,
          last_verified_at: now,
        },
        { onConflict: 'employee_id' },
      ),
      'azure_devops_connections.savePat',
    );
  }

  /** Future Entra mode: the credential is the employee's token cache (`microsoft_token_caches`). */
  async saveEntra(employeeId: UUID, saved: SavedCredential): Promise<void> {
    const now = new Date().toISOString();
    unwrap(
      await this.table.upsert(
        {
          employee_id: employeeId,
          credential_type: 'ENTRA',
          encrypted_pat: null,
          pat_expires_at: null,
          organization: saved.organization,
          project: saved.project,
          status: saved.status,
          last_error: saved.lastError,
          connected_at: now,
          last_verified_at: now,
        },
        { onConflict: 'employee_id' },
      ),
      'azure_devops_connections.saveEntra',
    );
  }

  async markVerified(employeeId: UUID): Promise<void> {
    unwrap(
      await this.table.update({ status: 'CONNECTED', last_verified_at: new Date().toISOString(), last_error: null }).eq('employee_id', employeeId),
      'azure_devops_connections.markVerified',
    );
  }

  /** A team sync succeeded with this employee's credential. */
  async markSynced(employeeId: UUID): Promise<void> {
    const now = new Date().toISOString();
    unwrap(
      await this.table.update({ status: 'CONNECTED', last_verified_at: now, last_sync_at: now, last_error: null }).eq('employee_id', employeeId),
      'azure_devops_connections.markSynced',
    );
  }

  async markProblem(employeeId: UUID, status: Exclude<AzureConnectionState, 'CONNECTED' | 'DISCONNECTED'>, error: string): Promise<void> {
    unwrap(
      await this.table.update({ status, last_error: error.slice(0, 500), last_verified_at: new Date().toISOString() }).eq('employee_id', employeeId),
      'azure_devops_connections.markProblem',
    );
  }

  /** Forgets the credential (the sealed PAT is erased) but keeps the row as history. */
  async disconnect(employeeId: UUID): Promise<void> {
    unwrap(
      await this.table.update({ status: 'DISCONNECTED', encrypted_pat: null, pat_expires_at: null, last_error: null }).eq('employee_id', employeeId),
      'azure_devops_connections.disconnect',
    );
  }
}
