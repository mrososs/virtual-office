import type { Direction, UUID, Vector2 } from './common.types.js';

export interface PlayerPosition extends Vector2 {
  direction: Direction;
}

export interface NavigationPoint extends Vector2 {
  roomId?: UUID;
}

/**
 * MANUAL: the human is actively driving the avatar (WASD / arrow keys).
 * AUTO_NAVIGATION: the system is walking the avatar to a target (e.g. a meeting).
 * STATIC: the avatar is not moving (idle at desk, offline ghost, etc).
 *
 * AutoMovementSystem must never override a player currently in MANUAL mode;
 * it should queue/defer until the player releases control.
 */
export type PlayerControlMode = 'MANUAL' | 'AUTO_NAVIGATION' | 'STATIC';
