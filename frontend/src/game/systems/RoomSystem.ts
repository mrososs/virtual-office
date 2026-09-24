import type { UUID } from '@virtual-office/shared';
import type Phaser from 'phaser';

import { GAME_EVENTS, gameBridge } from '@/game/bridge';
import type { EmployeeAvatar } from '@/game/entities/EmployeeAvatar';
import { isPointInBounds } from '@/game/interactions/zone-detection';
import type { RoomVisual } from '@/game/rooms/RoomVisual';

const CHECK_INTERVAL_MS = 200;

/**
 * Tracks which room every avatar stands in. Emits EMPLOYEE_ROOM_CHANGED for
 * occupancy (all avatars) and PLAYER_ENTERED/LEFT_ROOM for the local player.
 * Runs on a short interval, not every frame — room membership is coarse.
 */
export class RoomSystem {
  private readonly roomByEmployee = new Map<UUID, UUID | null>();
  private elapsedMs = 0;

  constructor(
    protected readonly scene: Phaser.Scene,
    private readonly rooms: RoomVisual[],
    private readonly onRoomChanged: (employeeId: UUID, roomId: UUID | null, previousRoomId: UUID | null) => void,
  ) {}

  update(deltaMs: number, avatars: Iterable<EmployeeAvatar>): void {
    this.elapsedMs += deltaMs;
    if (this.elapsedMs < CHECK_INTERVAL_MS) return;
    this.elapsedMs = 0;
    for (const avatar of avatars) this.evaluate(avatar);
  }

  roomOf(employeeId: UUID): UUID | null {
    return this.roomByEmployee.get(employeeId) ?? null;
  }

  occupantsOf(roomId: UUID): UUID[] {
    const occupants: UUID[] = [];
    for (const [employeeId, current] of this.roomByEmployee) if (current === roomId) occupants.push(employeeId);
    return occupants;
  }

  /** Forces an immediate evaluation, e.g. right after a teleport. */
  evaluate(avatar: EmployeeAvatar): void {
    const nextRoomId = avatar.isHidden ? null : (this.rooms.find((room) => isPointInBounds(avatar.position, room.room.bounds))?.roomId ?? null);
    const previousRoomId = this.roomByEmployee.has(avatar.employeeId) ? (this.roomByEmployee.get(avatar.employeeId) ?? null) : undefined;
    if (previousRoomId === nextRoomId) return;
    this.roomByEmployee.set(avatar.employeeId, nextRoomId);
    if (previousRoomId === undefined && nextRoomId === null) return;
    this.onRoomChanged(avatar.employeeId, nextRoomId, previousRoomId ?? null);

    gameBridge.emit(GAME_EVENTS.EMPLOYEE_ROOM_CHANGED, {
      employeeId: avatar.employeeId,
      roomId: nextRoomId,
      previousRoomId: previousRoomId ?? null,
    });

    if (avatar.isLocal) {
      if (previousRoomId) gameBridge.emit(GAME_EVENTS.PLAYER_LEFT_ROOM, { employeeId: avatar.employeeId, roomId: previousRoomId });
      const room = nextRoomId ? this.rooms.find((candidate) => candidate.roomId === nextRoomId) : undefined;
      if (room) gameBridge.emit(GAME_EVENTS.PLAYER_ENTERED_ROOM, { employeeId: avatar.employeeId, roomId: room.roomId, roomType: room.type });
    }
  }

  forget(employeeId: UUID): void {
    const previousRoomId = this.roomByEmployee.get(employeeId) ?? null;
    this.roomByEmployee.delete(employeeId);
    if (previousRoomId) {
      this.onRoomChanged(employeeId, null, previousRoomId);
      gameBridge.emit(GAME_EVENTS.EMPLOYEE_ROOM_CHANGED, { employeeId, roomId: null, previousRoomId });
    }
  }
}
