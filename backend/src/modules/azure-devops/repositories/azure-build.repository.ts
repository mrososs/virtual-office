import { Injectable } from '@nestjs/common';
import { unwrap } from '../../../common/supabase/database.error';
import { SupabaseService } from '../../../common/supabase/supabase.service';
import { replaceTableRows, type AzureBuildRow } from './azure-rows';

@Injectable()
export class AzureBuildRepository {
  constructor(private readonly supabase: SupabaseService) {}

  replaceAll(rows: AzureBuildRow[], runStartedAt: string): Promise<void> {
    return replaceTableRows(this.supabase.client, 'azure_builds', 'build_id', rows, runStartedAt);
  }

  async listAll(): Promise<AzureBuildRow[]> {
    const rows = unwrap(
      await this.supabase.client.from('azure_builds').select('*').order('queued_at', { ascending: false, nullsFirst: false }).returns<AzureBuildRow[]>(),
      'azure_builds.listAll',
    );
    return rows ?? [];
  }
}
