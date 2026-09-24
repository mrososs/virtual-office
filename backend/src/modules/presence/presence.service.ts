import { Injectable, Logger } from '@nestjs/common';
import type { EmployeePresence, PresenceStatus, UUID } from '@virtual-office/shared';
import { SupabaseService } from '../../common/supabase/supabase.service';

/**
 * Tracks `EmployeePresence` — connection state only ("is this person's
 * client online right now"). This is intentionally isolated from the
 * Activity Engine (`modules/activities`): presence flips ONLINE/AWAY/OFFLINE
 * purely from websocket connect/disconnect/heartbeat events, never from
 * Azure DevOps or Microsoft Teams signals. Do not import ActivityEngine
 * here, and do not let activity data set `PresenceStatus`.
 */
@Injectable()
export class PresenceService {
  private readonly logger = new Logger(PresenceService.name);

  constructor(private readonly supabaseService: SupabaseService) {}

  async getPresence(employeeId: UUID): Promise<EmployeePresence | null> {
    // TODO: read cached/DB presence row for the employee.
    void employeeId;
    return null;
  }

  async handleConnect(employeeId: UUID, socketId: string): Promise<EmployeePresence> {
    // TODO: upsert presence to ONLINE, store `socketId`, broadcast
    // SOCKET_EVENTS.EMPLOYEE_PRESENCE_CHANGED via RealtimeModule.
    this.logger.debug(`Employee ${employeeId} connected on socket ${socketId}`);
    return this.buildPresence('ONLINE');
  }

  async handleDisconnect(employeeId: UUID, socketId: string): Promise<EmployeePresence> {
    // TODO: only flip to OFFLINE if `socketId` matches the currently tracked
    // connection (an employee may have multiple tabs/devices open).
    this.logger.debug(`Employee ${employeeId} disconnected socket ${socketId}`);
    return this.buildPresence('OFFLINE');
  }

  async setManualStatus(employeeId: UUID, status: PresenceStatus): Promise<EmployeePresence> {
    // TODO: allow an explicit "set myself AWAY" override from the client.
    void employeeId;
    return this.buildPresence(status);
  }

  private buildPresence(status: PresenceStatus): EmployeePresence {
    return {
      status,
      lastSeenAt: new Date().toISOString(),
      connectedSocketId: null,
    };
  }
}
