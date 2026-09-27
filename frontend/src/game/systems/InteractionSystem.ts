import type { UUID } from '@virtual-office/shared';
import Phaser from 'phaser';

import { GAME_EVENTS, gameBridge, type InteractionTarget } from '@/game/bridge';
import type { DeskEntity } from '@/game/entities/Desk';
import type { EmployeeAvatar } from '@/game/entities/EmployeeAvatar';
import type { GameStationEntity } from '@/game/entities/GameStation';
import type { InteractiveObjectEntity } from '@/game/entities/InteractiveObject';
import { distance } from '@/game/maps/map-geometry';
import type { RoomVisual } from '@/game/rooms/RoomVisual';

const EMPLOYEE_RADIUS = 62;
/** Avatar hit box relative to the feet (the body Container has no size of its own). */
const AVATAR_HIT_AREA = new Phaser.Geom.Rectangle(-11, -40, 22, 42);
const DESK_RADIUS = 42;
const PROXIMITY_INTERVAL_MS = 120;

export interface ProximityContext {
  local: EmployeeAvatar;
  avatars: Iterable<EmployeeAvatar>;
  desks: Iterable<DeskEntity>;
  /** The game station within reach of a point, if any. It wins over people standing at it (you came to play). */
  stationNear: (point: { x: number; y: number }) => GameStationEntity | null;
  currentRoom: RoomVisual | undefined;
  deskLabel: (desk: DeskEntity) => string;
}

/**
 * Centralizes pointer and keyboard interaction policy for world objects and
 * relays intents onto GameBridge. Entities never emit bridge events themselves.
 */
export class InteractionSystem {
  private current: InteractionTarget | null = null;
  private nearbyAvatar: EmployeeAvatar | null = null;
  private elapsedMs = PROXIMITY_INTERVAL_MS;

  constructor(protected readonly scene: Phaser.Scene) {
    scene.input.on('pointerdown', (_pointer: Phaser.Input.Pointer, over: Phaser.GameObjects.GameObject[]) => {
      if (over.length === 0) gameBridge.emit(GAME_EVENTS.BACKGROUND_CLICKED, undefined);
    });
  }

  registerEmployee(avatar: EmployeeAvatar): void {
    const body = avatar.body;
    body.setInteractive({ hitArea: AVATAR_HIT_AREA, hitAreaCallback: Phaser.Geom.Rectangle.Contains, useHandCursor: true });
    body.on('pointerover', () => avatar.setHovered(true));
    body.on('pointerout', () => avatar.setHovered(false));
    body.on('pointerdown', () => this.emitEmployee(avatar.employeeId, 'pointer'));
  }

  registerDesk(desk: DeskEntity): void {
    desk.surface.on('pointerover', () => {
      desk.setHighlighted(true);
      desk.showTooltip(true);
    });
    desk.surface.on('pointerout', () => {
      desk.setHighlighted(false);
      desk.showTooltip(false);
    });
    desk.surface.on('pointerdown', () => gameBridge.emit(GAME_EVENTS.DESK_CLICKED, { deskId: desk.deskId, source: 'pointer' }));
  }

  registerRoom(room: RoomVisual): void {
    room.labelChip.on('pointerover', () => room.setHovered(true));
    room.labelChip.on('pointerout', () => room.setHovered(false));
    room.labelChip.on('pointerdown', () => gameBridge.emit(GAME_EVENTS.ROOM_CLICKED, { roomId: room.roomId, source: 'pointer' }));
    room.sign?.on('pointerdown', () => gameBridge.emit(GAME_EVENTS.OPEN_MEETING_DETAILS, { roomId: room.roomId }));
  }

  registerFurniture(entity: InteractiveObjectEntity): void {
    const { meetingRoomId: roomId, stationId } = entity.placement;
    if (roomId) entity.image.on('pointerdown', () => gameBridge.emit(GAME_EVENTS.MEETING_JOIN_REQUESTED, { roomId }));
    if (stationId) entity.image.on('pointerdown', () => gameBridge.emit(GAME_EVENTS.STATION_CLICKED, { stationId, source: 'pointer' }));
  }

  registerStation(station: GameStationEntity): void {
    station.chip.on('pointerdown', () => gameBridge.emit(GAME_EVENTS.STATION_CLICKED, { stationId: station.stationId, source: 'pointer' }));
  }

  /** Picks the single best thing the local player could interact with ("Press E"). */
  updateProximity(deltaMs: number, context: ProximityContext): void {
    this.elapsedMs += deltaMs;
    if (this.elapsedMs < PROXIMITY_INTERVAL_MS) return;
    this.elapsedMs = 0;

    const origin = context.local.position;
    let bestAvatar: EmployeeAvatar | null = null;
    let bestAvatarDistance = EMPLOYEE_RADIUS;
    for (const avatar of context.avatars) {
      if (avatar.isHidden || avatar.isLocal) continue;
      const d = distance(origin, avatar.position);
      if (d < bestAvatarDistance) {
        bestAvatar = avatar;
        bestAvatarDistance = d;
      }
    }

    let next: InteractionTarget | null = null;
    const station = context.stationNear(origin);
    if (station) {
      next = { kind: 'STATION', id: station.stationId, label: station.stationId };
      bestAvatar = null;
    } else if (bestAvatar) {
      next = { kind: 'EMPLOYEE', id: bestAvatar.employeeId, label: bestAvatar.status.displayName };
    } else {
      let bestDesk: DeskEntity | null = null;
      let bestDeskDistance = DESK_RADIUS;
      for (const desk of context.desks) {
        const d = distance(origin, desk.seat);
        if (d < bestDeskDistance) {
          bestDesk = desk;
          bestDeskDistance = d;
        }
      }
      if (bestDesk) next = { kind: 'DESK', id: bestDesk.deskId, label: context.deskLabel(bestDesk) };
      else if (context.currentRoom) next = { kind: 'ROOM', id: context.currentRoom.roomId, label: context.currentRoom.room.name };
    }

    if (this.nearbyAvatar !== bestAvatar) {
      this.nearbyAvatar?.setNearby(false);
      bestAvatar?.setNearby(true);
      this.nearbyAvatar = bestAvatar;
    }

    if (next?.kind !== this.current?.kind || next?.id !== this.current?.id) {
      this.current = next;
      gameBridge.emit(GAME_EVENTS.INTERACTION_AVAILABLE, { target: next });
    }
  }

  /** The "E" key. */
  triggerCurrent(): void {
    const target = this.current;
    if (!target) return;
    if (target.kind === 'EMPLOYEE') this.emitEmployee(target.id, 'keyboard');
    else if (target.kind === 'STATION') gameBridge.emit(GAME_EVENTS.STATION_CLICKED, { stationId: target.id, source: 'keyboard' });
    else if (target.kind === 'DESK') gameBridge.emit(GAME_EVENTS.DESK_CLICKED, { deskId: target.id, source: 'keyboard' });
    else gameBridge.emit(GAME_EVENTS.ROOM_CLICKED, { roomId: target.id, source: 'keyboard' });
  }

  forgetAvatar(avatar: EmployeeAvatar): void {
    if (this.nearbyAvatar === avatar) this.nearbyAvatar = null;
  }

  private emitEmployee(employeeId: UUID, source: 'pointer' | 'keyboard'): void {
    gameBridge.emit(GAME_EVENTS.EMPLOYEE_CLICKED, { employeeId, source });
  }
}
