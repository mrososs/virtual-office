import type Phaser from 'phaser';

import { furnitureBounds, normalizeAngle } from '@/game/maps/map-geometry';
import type { FurniturePlacement } from '@/game/maps/office-map.types';
import { ensureFurnitureTexture, FURNITURE_CATALOG } from '@/game/rendering/furniture-textures';
import { renderScaleOf } from '@/game/rendering/render-scale';

/**
 * One placed piece of furniture. Seats sort by their top edge so a seated
 * avatar draws above them; everything else sorts by its bottom edge.
 */
export class InteractiveObjectEntity {
  public readonly placement: FurniturePlacement;
  public readonly image: Phaser.GameObjects.Image;

  constructor(scene: Phaser.Scene, placement: FurniturePlacement) {
    this.placement = placement;
    const spec = FURNITURE_CATALOG[placement.kind];
    const bounds = furnitureBounds(placement);
    const key = ensureFurnitureTexture(scene, placement.kind, placement.variant);

    this.image = scene.add
      .image(placement.x, placement.y, key)
      .setScale(1 / renderScaleOf(scene).textureScale)
      .setAngle(normalizeAngle(placement.angle))
      .setDepth(spec.seat ? bounds.y : bounds.y + bounds.height);

    if (placement.meetingRoomId) {
      this.image.setInteractive({ useHandCursor: true });
    }
  }

  get isInteractive(): boolean {
    return this.placement.meetingRoomId !== undefined;
  }

  destroy(): void {
    this.image.destroy();
  }
}
