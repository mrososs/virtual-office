import { Injectable } from '@nestjs/common';
import type { UUID } from '@virtual-office/shared';
import { unwrap, unwrapRow } from '../../common/supabase/database.error';
import { SupabaseService } from '../../common/supabase/supabase.service';
import { EMPLOYEE_COLUMNS, toEmployeeRecord, type EmployeeRow } from '../employees/employee.record';
import type { AppSession, AuthContext } from './session.types';

interface SessionRow {
  id: string;
  employee_id: string;
  created_at: string;
  last_seen_at: string;
  expires_at: string;
}

const SESSION_COLUMNS = 'id, employee_id, created_at, last_seen_at, expires_at';

function toSession(row: SessionRow): AppSession {
  return {
    id: row.id,
    employeeId: row.employee_id,
    createdAt: row.created_at,
    lastSeenAt: row.last_seen_at,
    expiresAt: row.expires_at,
  };
}

/** `public.app_sessions` — rows are looked up by the keyed hash of the cookie value (or by id, for a verified realtime ticket). */
@Injectable()
export class SessionRepository {
  constructor(private readonly supabase: SupabaseService) {}

  private get table() {
    return this.supabase.client.from('app_sessions');
  }

  async create(input: { employeeId: UUID; tokenHash: string; expiresAt: string; userAgent: string | null }): Promise<AppSession> {
    const row = unwrapRow(
      await this.table
        .insert({ employee_id: input.employeeId, token_hash: input.tokenHash, expires_at: input.expiresAt, user_agent: input.userAgent })
        .select(SESSION_COLUMNS)
        .single<SessionRow>(),
      'app_sessions.create',
    );
    return toSession(row);
  }

  /** The session plus its employee in one round trip. */
  async findByTokenHash(tokenHash: string): Promise<AuthContext | null> {
    const row = unwrap(
      await this.table
        .select(`${SESSION_COLUMNS}, employee:employees!inner(${EMPLOYEE_COLUMNS})`)
        .eq('token_hash', tokenHash)
        .maybeSingle<SessionRow & { employee: EmployeeRow }>(),
      'app_sessions.findByTokenHash',
    );
    return row ? { session: toSession(row), employee: toEmployeeRecord(row.employee) } : null;
  }

  /** Same as `findByTokenHash`, by session id (realtime tickets name the session they were issued for). */
  async findById(id: UUID): Promise<AuthContext | null> {
    const row = unwrap(
      await this.table
        .select(`${SESSION_COLUMNS}, employee:employees!inner(${EMPLOYEE_COLUMNS})`)
        .eq('id', id)
        .maybeSingle<SessionRow & { employee: EmployeeRow }>(),
      'app_sessions.findById',
    );
    return row ? { session: toSession(row), employee: toEmployeeRecord(row.employee) } : null;
  }

  async touch(id: UUID, at: string): Promise<void> {
    unwrap(await this.table.update({ last_seen_at: at }).eq('id', id), 'app_sessions.touch');
  }

  async delete(id: UUID): Promise<void> {
    unwrap(await this.table.delete().eq('id', id), 'app_sessions.delete');
  }

  /** Removes sessions past their absolute expiry or idle for longer than allowed; returns how many. */
  async deleteExpired(now: string, idleCutoff: string): Promise<number> {
    const rows = unwrap(
      await this.table.delete().or(`expires_at.lt."${now}",last_seen_at.lt."${idleCutoff}"`).select('id'),
      'app_sessions.deleteExpired',
    );
    return rows?.length ?? 0;
  }
}
