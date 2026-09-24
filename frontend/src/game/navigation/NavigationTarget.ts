import type { Direction, UUID, Vector2 } from '@virtual-office/shared';

/**
 * A resolved destination for AUTO_NAVIGATION movement — e.g. "walk to seat 2
 * of Meeting Room 1" or "walk to this employee's desk chair".
 */
export interface NavigationTarget {
  position: Vector2;
  facing?: Direction;
  roomId?: UUID;
}
