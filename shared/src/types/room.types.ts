import type { Bounds, UUID, Vector2 } from './common.types.js';

/**
 * Kinds of area on the floor. Deliberately few: everyday work (coding,
 * building, testing) happens at the person's own desk, so activities do not
 * each get a room. Roles point at their home area via `ROLE_CONFIG`.
 */
export type RoomType =
  | 'MANAGEMENT'
  | 'PROJECT_MANAGEMENT'
  | 'TEAM_LEAD'
  | 'DEVELOPMENT'
  | 'QA'
  | 'MEETING'
  /** Collaboration / code review area. */
  | 'CODE_REVIEW'
  /** Game room, kitchen & lounge. */
  | 'BREAK'
  /** Reception and other common space; the neutral fallback. */
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
