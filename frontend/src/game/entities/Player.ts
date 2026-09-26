import type { AvatarAppearance, Direction, PlayerControlMode, UUID, Vector2 } from '@virtual-office/shared';
import Phaser from 'phaser';

import type { AvatarFactory, AvatarInstance } from '@/game/avatars/AvatarFactory';

/**
 * The moving body of any avatar (local player, NPC or remote person): a
 * Container at the avatar's feet holding its layered sprites, so `y`
 * doubles as the Y-sort depth key and every layer moves as one.
 *
 * Control-mode rule (enforced by MovementSystem/AutoMovementSystem, not
 * here): AUTO_NAVIGATION must NEVER override a player currently in MANUAL
 * mode — a pending auto-move request must be deferred until the player
 * releases control.
 */
export class Player extends Phaser.GameObjects.Container {
  public readonly employeeId: UUID;
  public direction: Direction = 'down';
  public controlMode: PlayerControlMode = 'STATIC';
  private readonly avatar: AvatarInstance;

  constructor(scene: Phaser.Scene, employeeId: UUID, position: Vector2, appearance: AvatarAppearance, avatars: AvatarFactory) {
    super(scene, position.x, position.y);
    this.employeeId = employeeId;
    this.avatar = avatars.create(this, appearance);
    scene.add.existing(this);
    this.updateMotion(false, 0);
  }

  setControlMode(mode: PlayerControlMode): void {
    this.controlMode = mode;
  }

  face(direction: Direction): void {
    this.direction = direction;
  }

  /** Walk vs idle for the current facing, advanced by `deltaMs`. */
  updateMotion(moving: boolean, deltaMs: number): void {
    this.avatar.animation.update(this.direction, moving, deltaMs);
  }

  /** Re-skins in place (only changed layers are re-textured). */
  setAppearance(appearance: AvatarAppearance): void {
    this.avatar.renderer.setAppearance(appearance);
  }

  get appearanceKey(): string {
    return this.avatar.renderer.appearanceKeyValue;
  }

  debugLayers(): ReturnType<AvatarInstance['renderer']['debugLayers']> {
    return this.avatar.renderer.debugLayers();
  }

  override destroy(fromScene?: boolean): void {
    super.destroy(fromScene);
    this.avatar.renderer.dispose();
  }
}
