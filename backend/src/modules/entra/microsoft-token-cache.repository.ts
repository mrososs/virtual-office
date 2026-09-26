import { Injectable } from '@nestjs/common';
import type { UUID } from '@virtual-office/shared';
import { unwrap } from '../../common/supabase/database.error';
import { SupabaseService } from '../../common/supabase/supabase.service';

export interface StoredTokenCache {
  homeAccountId: string;
  /** AES-256-GCM sealed MSAL cache JSON — opaque to the database. */
  encryptedCache: string;
}

/** `public.microsoft_token_caches`: one encrypted MSAL cache per employee. */
@Injectable()
export class MicrosoftTokenCacheRepository {
  constructor(private readonly supabase: SupabaseService) {}

  private get table() {
    return this.supabase.client.from('microsoft_token_caches');
  }

  async find(employeeId: UUID): Promise<StoredTokenCache | null> {
    const row = unwrap(
      await this.table.select('home_account_id, encrypted_cache').eq('employee_id', employeeId).maybeSingle<{ home_account_id: string; encrypted_cache: string }>(),
      'microsoft_token_caches.find',
    );
    return row ? { homeAccountId: row.home_account_id, encryptedCache: row.encrypted_cache } : null;
  }

  async save(employeeId: UUID, cache: StoredTokenCache): Promise<void> {
    unwrap(
      await this.table.upsert(
        { employee_id: employeeId, home_account_id: cache.homeAccountId, encrypted_cache: cache.encryptedCache },
        { onConflict: 'employee_id' },
      ),
      'microsoft_token_caches.save',
    );
  }

  async delete(employeeId: UUID): Promise<void> {
    unwrap(await this.table.delete().eq('employee_id', employeeId), 'microsoft_token_caches.delete');
  }
}
