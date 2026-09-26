import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import type { EmployeePresence, UUID } from '@virtual-office/shared';
import { SupabaseService } from '../../common/supabase/supabase.service';
import { PresenceRepository, type PresenceRow } from './presence.repository';

const OFFLINE: EmployeePresence = { status: 'OFFLINE', lastSeenAt: null, connectedSocketId: null };

/**
 * Tracks `EmployeePresence` — "connected to the Virtual Office" only. It
 * flips purely from office socket joins/leaves (counted per socket, so a
 * second tab or device keeps someone online when the first closes), never
 * from Microsoft sign-in state, Azure DevOps or Teams. Do not import
 * ActivityEngine here, and do not let activity data set `PresenceStatus`.
 */
@Injectable()
export class PresenceService implements OnApplicationBootstrap {
  private readonly logger = new Logger(PresenceService.name);

  constructor(
    private readonly repository: PresenceRepository,
    private readonly supabase: SupabaseService,
  ) {}

  /** Single backend instance: after a restart no socket can still be connected. */
  async onApplicationBootstrap(): Promise<void> {
    if (!this.supabase.isConfigured()) return;
    try {
      await this.repository.resetAll();
    } catch (error) {
      this.logger.warn(`Could not reset presence on boot: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /** One more connection for the employee; returns the resulting presence. */
  async connect(employeeId: UUID): Promise<EmployeePresence> {
    return toPresence(await this.repository.connect(employeeId));
  }

  /** One connection fewer; they stay ONLINE while any other tab/device is connected. */
  async disconnect(employeeId: UUID): Promise<EmployeePresence> {
    return toPresence(await this.repository.disconnect(employeeId));
  }

  async listAll(): Promise<Map<UUID, EmployeePresence>> {
    const rows = await this.repository.listAll();
    return new Map(rows.filter((row) => row.employee_id).map((row) => [row.employee_id as string, toPresence(row)]));
  }

  offline(): EmployeePresence {
    return { ...OFFLINE };
  }
}

function toPresence(row: PresenceRow | null): EmployeePresence {
  if (!row) return { ...OFFLINE };
  return { status: row.online ? 'ONLINE' : 'OFFLINE', lastSeenAt: row.last_seen_at, connectedSocketId: null };
}
