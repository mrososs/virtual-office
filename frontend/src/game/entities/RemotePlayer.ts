import type { Direction, UUID, Vector2 } from '@virtual-office/shared';
import type Phaser from 'phaser';

import type { AvatarAppearance } from '@/shared/utils/avatar-appearance';

import { Player } from './Player';

const SNAP_DISTANCE = 320;

/**
 * An avatar body not driven by local input: either scripted (NPC,
 * AUTO_NAVIGATION) or a real remote person whose `player:position`
 * broadcasts are smoothed here. Never reads keyboard input.
 */
export class RemotePlayer extends Player {
  private networkTarget: Vector2 | null = null;

  constructor(scene: Phaser.Scene, employeeId: UUID, position: Vector2, appearance: AvatarAppearance) {
    super(scene, employeeId, position, appearance);
  }

  /** Called by PlayerSync when a `player:position` broadcast arrives. */
  applyServerPosition(position: Vector2, direction: Direction): void {
    this.face(direction);
    if (Math.hypot(position.x - this.x, position.y - this.y) > SNAP_DISTANCE) {
      this.setPosition(position.x, position.y);
    }
    this.networkTarget = { x: position.x, y: position.y };
  }

  clearNetworkTarget(): void {
    this.networkTarget = null;
  }

  /** Exponential smoothing toward the latest server position (no prediction, by design). */
  stepInterpolation(deltaMs: number): void {
    if (!this.networkTarget) return;
    const t = 1 - Math.exp(-deltaMs / 70);
    const dx = this.networkTarget.x - this.x;
    const dy = this.networkTarget.y - this.y;
    if (Math.abs(dx) < 0.3 && Math.abs(dy) < 0.3) {
      this.setPosition(this.networkTarget.x, this.networkTarget.y);
      return;
    }
    this.setPosition(this.x + dx * t, this.y + dy * t);
  }
}
