import type Phaser from 'phaser';

import { AVATAR_FEET_Y } from '@/game/avatars/avatar-frame';
import type { AvatarFactory } from '@/game/avatars/AvatarFactory';
import type { EmployeeWorldState } from '@/game/bridge/GameEvents';
import { EmployeeAvatar } from '@/game/entities/EmployeeAvatar';
import type { MapSpot } from '@/game/maps/office-map.types';
import type { AutoMovementSystem } from '@/game/systems/AutoMovementSystem';
import type { MovementSystem } from '@/game/systems/MovementSystem';
import type { MovementInputState } from '@/game/types';

/** Feet-sized collision box, in logical px (frame coordinates). */
const BODY_WIDTH = 14;
const BODY_HEIGHT = 7;
const BODY_TOP = 34;

/**
 * Owns the single locally-controlled avatar. Human input always wins: any
 * key press while auto-navigating cancels the walk and switches to MANUAL.
 */
export class PlayerManager {
  private avatar: EmployeeAvatar | null = null;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly movement: MovementSystem,
    private readonly autoMovement: AutoMovementSystem,
    private readonly avatars: AvatarFactory,
  ) {}

  spawn(state: EmployeeWorldState, spot: MapSpot): EmployeeAvatar {
    this.avatar?.destroy();
    const avatar = new EmployeeAvatar(this.scene, {
      status: state.status,
      appearance: state.appearance,
      position: { x: spot.x, y: spot.y },
      facing: spot.facing,
      isLocal: true,
      avatars: this.avatars,
    });
    // The body is a size-less Container at the feet, so the offset is relative to the feet point.
    this.scene.physics.add.existing(avatar.body);
    const body = avatar.body.body as Phaser.Physics.Arcade.Body;
    body.setSize(BODY_WIDTH, BODY_HEIGHT, false);
    body.setOffset(-BODY_WIDTH / 2, BODY_TOP - AVATAR_FEET_Y);
    body.setCollideWorldBounds(true);
    this.avatar = avatar;
    return avatar;
  }

  getLocalPlayer(): EmployeeAvatar | null {
    return this.avatar;
  }

  /** Returns true when the human is actively steering this frame. */
  update(input: MovementInputState): boolean {
    const avatar = this.avatar;
    if (!avatar) return false;
    const hasInput = input.up || input.down || input.left || input.right;

    if (hasInput) {
      if (avatar.body.controlMode === 'AUTO_NAVIGATION') this.autoMovement.cancel(avatar.employeeId, 'cancelled');
      avatar.body.setControlMode('MANUAL');
      this.movement.applyManual(avatar, input);
    } else if (avatar.body.controlMode === 'MANUAL') {
      this.movement.applyManual(avatar, input);
      avatar.body.setControlMode('STATIC');
    }
    return hasInput;
  }

  destroy(): void {
    this.avatar?.destroy();
    this.avatar = null;
  }
}
