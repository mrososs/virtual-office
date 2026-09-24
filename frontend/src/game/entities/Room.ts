import type { Bounds } from '@virtual-office/shared';
import type Phaser from 'phaser';

import { DEPTH } from '@/game/rendering/depth';
import { WORLD_COLORS } from '@/game/rendering/world-palette';

export type RoomHighlight = 'NONE' | 'SELECTED' | 'LIVE';

/**
 * Low-level floor outline for a room (selection / live-meeting glow). Pure
 * rendering primitive — `game/rooms/RoomVisual` decides when to show it.
 */
export class RoomEntity {
  private readonly graphics: Phaser.GameObjects.Graphics;
  private mode: RoomHighlight = 'NONE';

  constructor(
    scene: Phaser.Scene,
    private readonly bounds: Bounds,
  ) {
    this.graphics = scene.add.graphics().setDepth(DEPTH.ROOM_HIGHLIGHT);
  }

  setHighlight(mode: RoomHighlight): void {
    if (this.mode === mode) return;
    this.mode = mode;
    const { x, y, width, height } = this.bounds;
    this.graphics.clear();
    if (mode === 'NONE') return;
    const color = mode === 'SELECTED' ? WORLD_COLORS.accent : 0xef4444;
    this.graphics.fillStyle(color, mode === 'SELECTED' ? 0.07 : 0.05);
    this.graphics.fillRoundedRect(x + 6, y + 6, width - 12, height - 12, 12);
    this.graphics.lineStyle(2, color, mode === 'SELECTED' ? 0.8 : 0.45);
    this.graphics.strokeRoundedRect(x + 6, y + 6, width - 12, height - 12, 12);
  }

  setPulseAlpha(alpha: number): void {
    this.graphics.setAlpha(alpha);
  }

  destroy(): void {
    this.graphics.destroy();
  }
}
