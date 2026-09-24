import type Phaser from 'phaser';

import type { EmployeeAvatar } from '@/game/entities/EmployeeAvatar';

/**
 * Presentation pass run once per frame after movement: picks walk/idle
 * animations from actual motion, Y-sorts avatars and keeps their overlays
 * (shadow, ring, badge, label) attached.
 */
export class AnimationSystem {
  constructor(protected readonly scene: Phaser.Scene) {}

  update(avatars: Iterable<EmployeeAvatar>): void {
    for (const avatar of avatars) {
      if (!avatar.isHidden) avatar.sync();
    }
  }
}
