import type { Bounds, Direction, UUID, Vector2 } from '@virtual-office/shared';

/**
 * Rendering/layout description of one office floor. Purely spatial: which
 * floor finish goes where, walls, furniture and seats. Domain facts (room
 * type, capacity, desk ownership) stay on the shared `Room` / `Desk` models
 * and are only referenced here by id.
 */
export type FloorStyle =
  | 'CORRIDOR'
  | 'CARPET_BLUE'
  | 'CARPET_ROSE'
  | 'CARPET_MINT'
  | 'CARPET_SAND'
  | 'CARPET_LAVENDER'
  | 'WOOD_LIGHT'
  | 'WOOD_DARK'
  | 'TILE_KITCHEN'
  | 'RUBBER_TEAL'
  | 'MARBLE';

export type WallStyle = 'OUTER' | 'INNER' | 'GLASS';

/** Axis-aligned wall centerline. Doors are simply gaps between segments. */
export interface WallSegment {
  from: Vector2;
  to: Vector2;
  style: WallStyle;
}

export interface DoorPlacement {
  from: Vector2;
  to: Vector2;
}

export interface FloorArea {
  bounds: Bounds;
  style: FloorStyle;
}

export interface RugPlacement {
  bounds: Bounds;
  color: number;
  pattern: 'PLAIN' | 'BORDERED' | 'STRIPED';
}

export type FurnitureKind =
  | 'CHAIR'
  | 'STOOL'
  | 'ARMCHAIR'
  | 'SOFA'
  | 'BEANBAG'
  | 'COFFEE_TABLE'
  | 'MEETING_TABLE_ROUND'
  | 'MEETING_TABLE_LONG'
  | 'REVIEW_TABLE'
  | 'DINING_TABLE'
  | 'TV_SCREEN'
  | 'BIG_SCREEN'
  | 'WHITEBOARD'
  | 'WHITEBOARD_STAND'
  | 'MOODBOARD'
  | 'BOOKSHELF'
  | 'PLANT_LARGE'
  | 'PLANT_SMALL'
  | 'PLANTER_LONG'
  | 'FLOOR_LAMP'
  | 'KITCHEN_COUNTER'
  | 'FRIDGE'
  | 'WATER_COOLER'
  | 'PING_PONG'
  | 'FOOSBALL'
  | 'ARCADE'
  | 'RECEPTION_DESK'
  | 'FOCUS_POD'
  | 'DRAWING_TABLE'
  | 'DEVICE_RACK'
  | 'PRINTER';

export type FurnitureAngle = 0 | 90 | 180 | 270;

export interface FurniturePlacement {
  id: string;
  kind: FurnitureKind;
  /** Center of the footprint, world px. */
  x: number;
  y: number;
  /** Clockwise. Seats face "down" and desks/pods seat their user "below" at angle 0. */
  angle?: FurnitureAngle;
  variant?: string;
  /** Screens in meeting rooms relay clicks as "open this room's meeting". */
  meetingRoomId?: UUID;
}

export interface MapSpot {
  x: number;
  y: number;
  facing: Direction;
}

export interface RoomLayout {
  roomId: UUID;
  /** Top-left anchor of the room name chip. */
  label: Vector2;
  /** Center of the meeting status sign (meeting rooms only). */
  sign?: Vector2;
  /** Seats / standing spots avatars can be placed on, in preference order. */
  spots: MapSpot[];
}

export interface FloorText {
  text: string;
  x: number;
  y: number;
  size: number;
  color: string;
  alpha: number;
}

export interface OfficeMapDefinition {
  key: string;
  width: number;
  height: number;
  tileSize: number;
  /** Walkable building interior (union of rects). Everything else is exterior. */
  footprint: Bounds[];
  floors: FloorArea[];
  rugs: RugPlacement[];
  walls: WallSegment[];
  doors: DoorPlacement[];
  furniture: FurniturePlacement[];
  roomLayouts: RoomLayout[];
  floorTexts: FloorText[];
  playerSpawn: MapSpot;
  /** Where arriving employees appear and where leaving employees walk out. */
  entrance: MapSpot;
}
