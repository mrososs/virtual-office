import type { Bounds, Desk, Direction, Vector2 } from '@virtual-office/shared';

import { DESK_HEIGHT, DESK_WIDTH, FURNITURE_CATALOG } from '@/game/rendering/furniture-textures';
import { WALL_PAINT } from '@/game/rendering/world-palette';

import type { FurnitureAngle, FurniturePlacement, MapSpot, WallSegment } from './office-map.types';

const DESK_SEAT_OFFSET = 25;

export function normalizeAngle(angle: number | undefined): FurnitureAngle {
  const normalized = (((Math.round((angle ?? 0) / 90) * 90) % 360) + 360) % 360;
  return normalized as FurnitureAngle;
}

function rotatedSize(width: number, height: number, angle: FurnitureAngle): { width: number; height: number } {
  return angle === 90 || angle === 270 ? { width: height, height: width } : { width, height };
}

function centeredBounds(center: Vector2, width: number, height: number): Bounds {
  return { x: center.x - width / 2, y: center.y - height / 2, width, height };
}

export function furnitureBounds(placement: FurniturePlacement): Bounds {
  const spec = FURNITURE_CATALOG[placement.kind];
  const size = rotatedSize(spec.width, spec.height, normalizeAngle(placement.angle));
  return centeredBounds(placement, size.width, size.height);
}

export function wallBounds(segment: WallSegment): Bounds {
  const thickness = WALL_PAINT[segment.style].thickness;
  const x0 = Math.min(segment.from.x, segment.to.x);
  const y0 = Math.min(segment.from.y, segment.to.y);
  const horizontal = segment.from.y === segment.to.y;
  return horizontal
    ? { x: x0 - thickness / 2, y: y0 - thickness / 2, width: Math.abs(segment.to.x - segment.from.x) + thickness, height: thickness }
    : { x: x0 - thickness / 2, y: y0 - thickness / 2, width: thickness, height: Math.abs(segment.to.y - segment.from.y) + thickness };
}

export function deskBounds(desk: Desk): Bounds {
  const size = rotatedSize(DESK_WIDTH, DESK_HEIGHT, normalizeAngle(desk.rotation));
  return centeredBounds(desk.position, size.width, size.height);
}

/** Angle 0 means the person faces the given direction when seated. */
export function facingForSeatAngle(angle: FurnitureAngle): Direction {
  switch (angle) {
    case 90:
      return 'left';
    case 180:
      return 'up';
    case 270:
      return 'right';
    default:
      return 'down';
  }
}

/** Desks put the monitor at their "top" edge (angle 0), so the chair sits on the opposite side. */
export function chairAngleForDesk(desk: Desk): FurnitureAngle {
  return normalizeAngle(normalizeAngle(desk.rotation) + 180);
}

export function deskSeat(desk: Desk): MapSpot {
  const angle = normalizeAngle(desk.rotation);
  const radians = (angle * Math.PI) / 180;
  // Rotate the "seat below the desk" vector (0, offset) clockwise by the desk angle.
  const dx = -Math.sin(radians) * DESK_SEAT_OFFSET;
  const dy = Math.cos(radians) * DESK_SEAT_OFFSET;
  return {
    x: desk.position.x + dx,
    y: desk.position.y + dy,
    facing: facingForSeatAngle(chairAngleForDesk(desk)),
  };
}

export function distance(a: Vector2, b: Vector2): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}
