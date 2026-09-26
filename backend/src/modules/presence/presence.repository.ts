import { Injectable } from '@nestjs/common';
import type { UUID } from '@virtual-office/shared';
import { unwrap } from '../../common/supabase/database.error';
import { SupabaseService } from '../../common/supabase/supabase.service';

export interface PresenceRow {
  employee_id: string | null;
  online: boolean | null;
  socket_count: number | null;
  last_seen_at: string | null;
}

/** `public.employee_presence`, changed only through the atomic presence_* functions. */
@Injectable()
export class PresenceRepository {
  constructor(private readonly supabase: SupabaseService) {}

  async connect(employeeId: UUID): Promise<PresenceRow | null> {
    const row = unwrap(await this.supabase.client.rpc('presence_connect', { p_employee_id: employeeId }), 'presence_connect') as PresenceRow | null;
    return row?.employee_id ? row : null;
  }

  async disconnect(employeeId: UUID): Promise<PresenceRow | null> {
    const row = unwrap(await this.supabase.client.rpc('presence_disconnect', { p_employee_id: employeeId }), 'presence_disconnect') as PresenceRow | null;
    return row?.employee_id ? row : null;
  }

  async resetAll(): Promise<void> {
    unwrap(await this.supabase.client.rpc('presence_reset_all'), 'presence_reset_all');
  }

  async listAll(): Promise<PresenceRow[]> {
    const rows = unwrap(
      await this.supabase.client.from('employee_presence').select('employee_id, online, socket_count, last_seen_at').returns<PresenceRow[]>(),
      'employee_presence.listAll',
    );
    return rows ?? [];
  }
}
