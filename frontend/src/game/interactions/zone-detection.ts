import type { Bounds, Vector2 } from '@virtual-office/shared';

/**
 * Pure geometry helpers for interaction-zone detection, kept framework-free
 * so they're trivially unit-testable without a Phaser.Scene.
 */
export function isPointInBounds(point: Vector2, bounds: Bounds): boolean {
  return (
    point.x >= bounds.x &&
    point.x <= bounds.x + bounds.width &&
    point.y >= bounds.y &&
    point.y <= bounds.y + bounds.height
  );
}

export function findContainingBounds<T extends { bounds: Bounds }>(point: Vector2, zones: T[]): T | undefined {
  return zones.find((zone) => isPointInBounds(point, zone.bounds));
}
