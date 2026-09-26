import {
  SOCKET_EVENTS,
  type AvatarProfile,
  type Direction,
  type PlayerPositionBroadcast,
  type UUID,
  type Vector2,
} from '@virtual-office/shared';

import type { OfficeSocket } from './OfficeSocket';

const SEND_INTERVAL_MS = 90;

export interface PlayerSyncHandlers {
  onRemotePosition(employeeId: UUID, position: Vector2, direction: Direction): void;
}

/**
 * Position traffic only: sends the local player's position (throttled while
 * moving, plus one final packet on stop) and relays remote `player:position`
 * broadcasts straight into the game world — never through Vue reactivity.
 */
export class PlayerSync {
  private lastSentAt = 0;
  private wasMoving = false;

  constructor(
    private readonly officeSocket: OfficeSocket,
    private readonly localEmployeeId: UUID,
    private readonly handlers: PlayerSyncHandlers,
  ) {}

  start(): void {
    this.officeSocket.on(SOCKET_EVENTS.PLAYER_POSITION, this.handlePositionBroadcast);
  }

  stop(): void {
    this.officeSocket.off(SOCKET_EVENTS.PLAYER_POSITION, this.handlePositionBroadcast);
  }

  /** The avatar travels once here (and on change via AvatarSync), never with movement packets. */
  join(officeId: UUID, position: Vector2, direction: Direction, avatar: AvatarProfile | null): void {
    this.officeSocket.emit(SOCKET_EVENTS.OFFICE_JOIN, { officeId, employeeId: this.localEmployeeId, position, direction, avatar });
  }

  report(position: Vector2, direction: Direction, moving: boolean, now: number): void {
    const stopped = this.wasMoving && !moving;
    this.wasMoving = moving;
    if (!moving && !stopped) return;
    if (!stopped && now - this.lastSentAt < SEND_INTERVAL_MS) return;
    this.lastSentAt = now;
    this.officeSocket.emit(SOCKET_EVENTS.PLAYER_MOVE, {
      employeeId: this.localEmployeeId,
      position: { x: Math.round(position.x), y: Math.round(position.y) },
      direction,
    });
  }

  private handlePositionBroadcast = (payload: PlayerPositionBroadcast): void => {
    if (payload.employeeId === this.localEmployeeId) return;
    this.handlers.onRemotePosition(payload.employeeId, payload.position, payload.direction);
  };
}
