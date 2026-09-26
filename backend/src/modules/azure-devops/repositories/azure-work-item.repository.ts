import { Injectable } from '@nestjs/common';
import { unwrap } from '../../../common/supabase/database.error';
import { SupabaseService } from '../../../common/supabase/supabase.service';
import { replaceTableRows, type AzureWorkItemRow } from './azure-rows';

@Injectable()
export class AzureWorkItemRepository {
  constructor(private readonly supabase: SupabaseService) {}

  replaceAll(rows: AzureWorkItemRow[], runStartedAt: string): Promise<void> {
    return replaceTableRows(this.supabase.client, 'azure_work_items', 'work_item_id', rows, runStartedAt);
  }

  async listAll(): Promise<AzureWorkItemRow[]> {
    const rows = unwrap(await this.supabase.client.from('azure_work_items').select('*').order('changed_at', { ascending: false }).returns<AzureWorkItemRow[]>(), 'azure_work_items.listAll');
    return rows ?? [];
  }
}
