import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { AppConfig } from '../../config/configuration';
import { DatabaseError } from './database.error';

/**
 * Lazy singleton wrapper around the Supabase JS client, created with the
 * service role key: the backend owns every privileged database operation and
 * the key never leaves this process. Repositories inject `SupabaseService` and
 * call `.client` rather than constructing their own `createClient(...)`.
 */
@Injectable()
export class SupabaseService implements OnModuleInit {
  private readonly logger = new Logger(SupabaseService.name);
  private _client: SupabaseClient | null = null;

  constructor(private readonly configService: ConfigService) {}

  onModuleInit(): void {
    if (!this.isConfigured()) {
      this.logger.warn('SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are not set — database-backed endpoints answer 503 until configured.');
    }
  }

  isConfigured(): boolean {
    const { supabase } = this.configService.get<AppConfig>('app')!;
    return Boolean(supabase.url && supabase.serviceRoleKey);
  }

  /** Returns the shared Supabase client, creating it on first access. */
  get client(): SupabaseClient {
    if (!this._client) {
      const { supabase } = this.configService.get<AppConfig>('app')!;
      if (!supabase.url || !supabase.serviceRoleKey) {
        throw new DatabaseError('Supabase is not configured (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY missing)');
      }
      this._client = createClient(supabase.url, supabase.serviceRoleKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      });
    }
    return this._client;
  }
}
