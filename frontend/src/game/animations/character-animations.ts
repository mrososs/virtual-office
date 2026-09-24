import type { Direction } from '@virtual-office/shared';
import type Phaser from 'phaser';

/** Animation key convention: `<textureKey>:<action>-<direction>`. */
export function walkAnimKey(textureKey: string, direction: Direction): string {
  return `${textureKey}:walk-${direction}`;
}

export function idleAnimKey(textureKey: string, direction: Direction): string {
  return `${textureKey}:idle-${direction}`;
}

/**
 * Registers the walk cycle and a slow "breathing" idle for one character
 * spritesheet. Frames are named by `frameName(direction, pose)`.
 */
export function registerCharacterAnimations(
  anims: Phaser.Animations.AnimationManager,
  textureKey: string,
  directions: readonly Direction[],
  frameName: (direction: Direction, pose: 'idle' | 'breathe' | 'stepA' | 'stepB') => string,
): void {
  for (const direction of directions) {
    if (!anims.exists(walkAnimKey(textureKey, direction))) {
      anims.create({
        key: walkAnimKey(textureKey, direction),
        frames: [
          { key: textureKey, frame: frameName(direction, 'stepA') },
          { key: textureKey, frame: frameName(direction, 'idle') },
          { key: textureKey, frame: frameName(direction, 'stepB') },
          { key: textureKey, frame: frameName(direction, 'idle') },
        ],
        frameRate: 9,
        repeat: -1,
      });
    }
    if (!anims.exists(idleAnimKey(textureKey, direction))) {
      anims.create({
        key: idleAnimKey(textureKey, direction),
        frames: [
          { key: textureKey, frame: frameName(direction, 'idle'), duration: 1500 },
          { key: textureKey, frame: frameName(direction, 'breathe'), duration: 700 },
        ],
        repeat: -1,
      });
    }
  }
}
