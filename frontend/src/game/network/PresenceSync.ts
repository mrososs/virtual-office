import {
  SOCKET_EVENTS,
  type Direction,
  type PlayerJoinedPayload,
  type PlayerLeftPayload,
  type UUID,
  type Vector2,
} from '@virtual-office/shared';

import type { OfficeSocket } from './OfficeSocket';

export interface PresenceSyncHandlers {
  onJoined(employeeId: UUID, position: Vector2, direction: Direction): void;
  onLeft(employeeId: UUID): void;
  onLiveEmployeesChanged(employeeIds: UUID[]): void;
}

/**
 * Tracks which other people are connected to this office in realtime
 * (`player:joined` / `player:left`). Connection presence only — activity and
 * domain presence flow through Vue stores, not through here.
 */
export class PresenceSync {
  private readonly live = new Set<UUID>();

  constructor(
    private readonly officeSocket: OfficeSocket,
    private readonly localEmployeeId: UUID,
    private readonly handlers: PresenceSyncHandlers,
  ) {}

  start(): void {
    this.officeSocket.on(SOCKET_EVENTS.PLAYER_JOINED, this.handleJoined);
    this.officeSocket.on(SOCKET_EVENTS.PLAYER_LEFT, this.handleLeft);
  }

  stop(): void {
    this.officeSocket.off(SOCKET_EVENTS.PLAYER_JOINED, this.handleJoined);
    this.officeSocket.off(SOCKET_EVENTS.PLAYER_LEFT, this.handleLeft);
  }

  /** Connection lost: everyone we knew about is no longer live. */
  clear(): void {
    const departed = [...this.live];
    this.live.clear();
    for (const employeeId of departed) this.handlers.onLeft(employeeId);
    if (departed.length > 0) this.handlers.onLiveEmployeesChanged([]);
  }

  private handleJoined = (payload: PlayerJoinedPayload): void => {
    if (payload.employeeId === this.localEmployeeId) return;
    this.live.add(payload.employeeId);
    this.handlers.onJoined(payload.employeeId, payload.position, payload.direction);
    this.handlers.onLiveEmployeesChanged([...this.live]);
  };

  private handleLeft = (payload: PlayerLeftPayload): void => {
    if (!this.live.delete(payload.employeeId)) return;
    this.handlers.onLeft(payload.employeeId);
    this.handlers.onLiveEmployeesChanged([...this.live]);
  };
}
