import { Injectable } from '@nestjs/common';
import { unwrap } from '../../../common/supabase/database.error';
import { SupabaseService } from '../../../common/supabase/supabase.service';
import { replaceTableRows, type AzurePullRequestRow } from './azure-rows';

@Injectable()
export class AzurePullRequestRepository {
  constructor(private readonly supabase: SupabaseService) {}

  replaceAll(rows: AzurePullRequestRow[], runStartedAt: string): Promise<void> {
    return replaceTableRows(this.supabase.client, 'azure_pull_requests', 'pull_request_id', rows, runStartedAt);
  }

  async listAll(): Promise<AzurePullRequestRow[]> {
    const rows = unwrap(
      await this.supabase.client.from('azure_pull_requests').select('*').order('created_at_azure', { ascending: false }).returns<AzurePullRequestRow[]>(),
      'azure_pull_requests.listAll',
    );
    return rows ?? [];
  }
}
