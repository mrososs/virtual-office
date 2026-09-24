import type { Direction, Vector2 } from '@virtual-office/shared';
import type Phaser from 'phaser';

import type { EmployeeAvatar } from '@/game/entities/EmployeeAvatar';
import type { MovementInputState } from '@/game/types';

export const MANUAL_SPEED = 170;
export const AUTO_SPEED = 105;

/**
 * Owns how avatars actually move. The local player moves through its Arcade
 * body (so walls collide); scripted/NPC avatars move kinematically along
 * paths. AutoMovementSystem decides *where*, this system decides *how*.
 */
export class MovementSystem {
  constructor(protected readonly scene: Phaser.Scene) {}

  /** Applies keyboard input to the local player's body. Returns true while any direction is held. */
  applyManual(avatar: EmployeeAvatar, input: MovementInputState): boolean {
    const x = (input.right ? 1 : 0) - (input.left ? 1 : 0);
    const y = (input.down ? 1 : 0) - (input.up ? 1 : 0);
    const body = this.arcadeBody(avatar);
    if (x === 0 && y === 0) {
      body?.setVelocity(0, 0);
      return false;
    }
    const length = Math.hypot(x, y);
    body?.setVelocity((x / length) * MANUAL_SPEED, (y / length) * MANUAL_SPEED);
    avatar.body.face(directionFor(x, y, avatar.body.direction));
    return true;
  }

  /** Velocity-based steering for the local player while auto-navigating (keeps collisions). */
  steerTowards(avatar: EmployeeAvatar, target: Vector2, speed: number): number {
    const dx = target.x - avatar.body.x;
    const dy = target.y - avatar.body.y;
    const distance = Math.hypot(dx, dy);
    const body = this.arcadeBody(avatar);
    if (distance < 0.5) {
      body?.setVelocity(0, 0);
      return 0;
    }
    body?.setVelocity((dx / distance) * speed, (dy / distance) * speed);
    avatar.body.face(directionFor(dx, dy, avatar.body.direction));
    return distance;
  }

  /** Kinematic step for non-physics avatars. Returns the remaining distance after the step. */
  stepTowards(avatar: EmployeeAvatar, target: Vector2, speed: number, deltaMs: number): number {
    const dx = target.x - avatar.body.x;
    const dy = target.y - avatar.body.y;
    const distance = Math.hypot(dx, dy);
    const step = (speed * deltaMs) / 1000;
    if (distance <= step) {
      avatar.body.setPosition(target.x, target.y);
      return 0;
    }
    avatar.body.setPosition(avatar.body.x + (dx / distance) * step, avatar.body.y + (dy / distance) * step);
    avatar.body.face(directionFor(dx, dy, avatar.body.direction));
    return distance - step;
  }

  stop(avatar: EmployeeAvatar): void {
    this.arcadeBody(avatar)?.setVelocity(0, 0);
  }

  private arcadeBody(avatar: EmployeeAvatar): Phaser.Physics.Arcade.Body | null {
    return (avatar.body.body as Phaser.Physics.Arcade.Body | null) ?? null;
  }
}

/** Dominant axis wins, so diagonal walking keeps a stable facing. */
export function directionFor(dx: number, dy: number, current: Direction): Direction {
  if (Math.abs(dx) < 0.001 && Math.abs(dy) < 0.001) return current;
  if (Math.abs(dx) > Math.abs(dy) * 1.05) return dx < 0 ? 'left' : 'right';
  return dy < 0 ? 'up' : 'down';
}
