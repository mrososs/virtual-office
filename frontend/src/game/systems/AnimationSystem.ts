import type Phaser from 'phaser';

import type { EmployeeAvatar } from '@/game/entities/EmployeeAvatar';

/**
 * Presentation pass run once per frame after movement: advances each
 * avatar's animation controller from its actual motion, Y-sorts avatars and
 * keeps their overlays (shadow, ring, badge, label) attached.
 */
export class AnimationSystem {
  constructor(protected readonly scene: Phaser.Scene) {}

  update(avatars: Iterable<EmployeeAvatar>, deltaMs: number): void {
    for (const avatar of avatars) {
      if (!avatar.isHidden) avatar.sync(deltaMs);
    }
  }
}
