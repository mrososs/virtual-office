import type { Bounds } from '@virtual-office/shared';
import type Phaser from 'phaser';

/**
 * Static colliders for walls and large furniture. Only the local player has
 * a dynamic body; NPCs follow collision-free paths and pass through each
 * other by design.
 */
export class CollisionSystem {
  private group: Phaser.Physics.Arcade.StaticGroup | null = null;

  constructor(protected readonly scene: Phaser.Scene) {}

  registerBlockers(blockers: Bounds[]): void {
    this.group?.destroy(true);
    const group = this.scene.physics.add.staticGroup();
    for (const blocker of blockers) {
      const zone = this.scene.add.zone(blocker.x + blocker.width / 2, blocker.y + blocker.height / 2, blocker.width, blocker.height);
      this.scene.physics.add.existing(zone, true);
      group.add(zone);
    }
    this.group = group;
  }

  attachPlayer(player: Phaser.GameObjects.GameObject): void {
    if (this.group) this.scene.physics.add.collider(player, this.group);
  }

  destroy(): void {
    this.group?.destroy(true);
    this.group = null;
  }
}
