import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { AppConfig } from '../../config/configuration';

/**
 * Lazy singleton wrapper around the Supabase JS client. Any module that
 * needs DB access injects `SupabaseService` and calls `.client` rather than
 * constructing its own `createClient(...)` — keeps credentials/config in one
 * place and makes it trivial to swap in a scoped (per-request) client later
 * if row-level security requires it.
 */
@Injectable()
export class SupabaseService implements OnModuleInit {
  private readonly logger = new Logger(SupabaseService.name);
  private _client: SupabaseClient | null = null;

  constructor(private readonly configService: ConfigService) {}

  onModuleInit(): void {
    const { supabase } = this.configService.get<AppConfig>('app')!;
    if (!supabase.url || !supabase.serviceRoleKey) {
      this.logger.warn(
        'SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are not set — SupabaseService.client will throw until configured.',
      );
    }
  }

  /** Returns the shared Supabase client, creating it on first access. */
  get client(): SupabaseClient {
    if (!this._client) {
      const { supabase } = this.configService.get<AppConfig>('app')!;
      if (!supabase.url || !supabase.serviceRoleKey) {
        throw new Error('Supabase is not configured (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY missing).');
      }
      this._client = createClient(supabase.url, supabase.serviceRoleKey, {
        auth: { persistSession: false },
      });
    }
    return this._client;
  }
}
