import type { Bounds, UUID, Vector2 } from './common.types.js';

export type RoomType =
  | 'DEVELOPMENT'
  | 'DESIGN'
  | 'QA'
  | 'CODE_REVIEW'
  | 'MEETING'
  | 'MANAGER'
  | 'FOCUS'
  | 'GAME'
  | 'KITCHEN'
  | 'LOUNGE'
  | 'GENERAL';

/**
 * Domain-level room model. Deliberately has no rendering/Phaser concerns —
 * the game layer maps a Room to its own visual representation separately.
 */
export interface Room {
  id: UUID;
  officeId: UUID;
  floorId?: UUID;
  name: string;
  type: RoomType;
  bounds: Bounds;
  capacity: number;
  navigationTarget: Vector2;
  isReserved?: boolean;
  activeMeetingId?: UUID | null;
  metadata?: Record<string, unknown>;
}

export interface RoomOccupancy {
  roomId: UUID;
  employeeIds: UUID[];
  count: number;
  capacity: number;
  updatedAt: string;
}

export interface InteractionZone {
  id: UUID;
  roomId?: UUID;
  bounds: Bounds;
  interactionType: 'DESK' | 'ROOM_ENTRY' | 'OBJECT' | 'NPC';
  targetId?: UUID;
}
