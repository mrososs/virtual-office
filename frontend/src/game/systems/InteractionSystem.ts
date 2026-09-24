import type { UUID } from '@virtual-office/shared';
import type Phaser from 'phaser';

import { GAME_EVENTS, gameBridge, type InteractionTarget } from '@/game/bridge';
import type { DeskEntity } from '@/game/entities/Desk';
import type { EmployeeAvatar } from '@/game/entities/EmployeeAvatar';
import type { InteractiveObjectEntity } from '@/game/entities/InteractiveObject';
import { distance } from '@/game/maps/map-geometry';
import type { RoomVisual } from '@/game/rooms/RoomVisual';

const EMPLOYEE_RADIUS = 62;
const DESK_RADIUS = 42;
const PROXIMITY_INTERVAL_MS = 120;

export interface ProximityContext {
  local: EmployeeAvatar;
  avatars: Iterable<EmployeeAvatar>;
  desks: Iterable<DeskEntity>;
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
    const sprite = avatar.body;
    sprite.setInteractive({ useHandCursor: true, pixelPerfect: false });
    sprite.on('pointerover', () => avatar.setHovered(true));
    sprite.on('pointerout', () => avatar.setHovered(false));
    sprite.on('pointerdown', () => this.emitEmployee(avatar.employeeId, 'pointer'));
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
    const roomId = entity.placement.meetingRoomId;
    if (!roomId) return;
    entity.image.on('pointerdown', () => gameBridge.emit(GAME_EVENTS.MEETING_JOIN_REQUESTED, { roomId }));
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
    if (bestAvatar) {
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
