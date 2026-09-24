import type { Direction, PlayerControlMode, UUID, Vector2 } from '@virtual-office/shared';
import Phaser from 'phaser';

import { idleAnimKey, walkAnimKey } from '@/game/animations/character-animations';
import { CHARACTER_FEET_Y, CHARACTER_FRAME_HEIGHT, characterFrameName, ensureCharacterTexture } from '@/game/rendering/character-textures';
import { renderScaleOf } from '@/game/rendering/render-scale';
import type { AvatarAppearance } from '@/shared/utils/avatar-appearance';

/**
 * The visible body of any avatar (local player, NPC or remote person).
 * Origin is at the feet so `y` doubles as the Y-sort depth key.
 *
 * Control-mode rule (enforced by MovementSystem/AutoMovementSystem, not
 * here): AUTO_NAVIGATION must NEVER override a player currently in MANUAL
 * mode — a pending auto-move request must be deferred until the player
 * releases control.
 */
export class Player extends Phaser.GameObjects.Sprite {
  public readonly employeeId: UUID;
  public direction: Direction = 'down';
  public controlMode: PlayerControlMode = 'STATIC';
  private readonly characterKey: string;
  private playingKey: string | null = null;

  constructor(scene: Phaser.Scene, employeeId: UUID, position: Vector2, appearance: AvatarAppearance) {
    const characterKey = ensureCharacterTexture(scene, appearance);
    super(scene, position.x, position.y, characterKey, characterFrameName('down', 'idle'));
    this.employeeId = employeeId;
    this.characterKey = characterKey;
    this.setOrigin(0.5, CHARACTER_FEET_Y / CHARACTER_FRAME_HEIGHT);
    this.setScale(1 / renderScaleOf(scene).textureScale);
    scene.add.existing(this);
    this.updateMotion(false);
  }

  setControlMode(mode: PlayerControlMode): void {
    this.controlMode = mode;
  }

  face(direction: Direction): void {
    if (this.direction === direction) return;
    this.direction = direction;
  }

  /** Picks walk vs idle for the current facing; no-op when already playing it. */
  updateMotion(moving: boolean): void {
    const key = moving ? walkAnimKey(this.characterKey, this.direction) : idleAnimKey(this.characterKey, this.direction);
    if (this.playingKey === key) return;
    this.playingKey = key;
    this.play({ key, startFrame: moving ? 0 : Phaser.Math.Between(0, 1) }, true);
  }
}
