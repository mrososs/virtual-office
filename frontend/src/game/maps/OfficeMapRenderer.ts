import type { Bounds } from '@virtual-office/shared';
import type Phaser from 'phaser';

import { ensureExteriorTexture } from '@/game/rendering/badge-textures';
import { createCanvasTexture, roundRect } from '@/game/rendering/canvas-texture';
import { DEPTH } from '@/game/rendering/depth';
import { renderScaleOf } from '@/game/rendering/render-scale';
import { FLOOR_PAINT, WALL_PAINT, WORLD_COLORS } from '@/game/rendering/world-palette';

import { wallBounds } from './map-geometry';
import type { FloorArea, FloorStyle, OfficeMapDefinition, RugPlacement } from './office-map.types';

const EXTERIOR_MARGIN = 900;
const SHADOW_TEXTURE_SCALE = 0.25;

interface FloorPattern {
  width: number;
  height: number;
  draw: (ctx: CanvasRenderingContext2D, line: string) => void;
}

/** Repeating floor finishes, drawn once and tiled (instead of thousands of per-frame line commands). */
const FLOOR_PATTERNS: Partial<Record<FloorStyle, FloorPattern>> = {
  WOOD_LIGHT: { width: 96, height: 32, draw: drawPlanks },
  WOOD_DARK: { width: 96, height: 32, draw: drawPlanks },
  TILE_KITCHEN: {
    width: 64,
    height: 64,
    draw: (ctx, line) => {
      ctx.globalAlpha = 0.35;
      ctx.fillStyle = line;
      ctx.fillRect(0, 0, 32, 32);
      ctx.fillRect(32, 32, 32, 32);
    },
  },
  CORRIDOR: { width: 64, height: 64, draw: (ctx, line) => drawGrid(ctx, line, 64, 0.6) },
  MARBLE: { width: 64, height: 64, draw: (ctx, line) => drawGrid(ctx, line, 64, 0.45) },
  RUBBER_TEAL: { width: 32, height: 32, draw: (ctx, line) => drawGrid(ctx, line, 32, 0.6) },
};

function drawPlanks(ctx: CanvasRenderingContext2D, line: string): void {
  ctx.strokeStyle = line;
  ctx.globalAlpha = 0.55;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, 15.5);
  ctx.lineTo(96, 15.5);
  ctx.moveTo(0, 31.5);
  ctx.lineTo(96, 31.5);
  ctx.moveTo(24.5, 0);
  ctx.lineTo(24.5, 16);
  ctx.moveTo(72.5, 16);
  ctx.lineTo(72.5, 32);
  ctx.stroke();
}

function drawGrid(ctx: CanvasRenderingContext2D, line: string, size: number, alpha: number): void {
  ctx.strokeStyle = line;
  ctx.globalAlpha = alpha;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(size - 0.5, 0);
  ctx.lineTo(size - 0.5, size);
  ctx.moveTo(0, size - 0.5);
  ctx.lineTo(size, size - 0.5);
  ctx.stroke();
}

const toHex = (color: number) => `#${color.toString(16).padStart(6, '0')}`;

/**
 * Draws the static floor plan (exterior, floors, rugs, walls, thresholds,
 * floor lettering). Only cheap primitives are redrawn each frame — plain
 * rect fills and straight lines; anything curved or repetitive is baked into
 * textures once. Furniture, desks and rooms are separate entities owned by managers.
 */
export class OfficeMapRenderer {
  private readonly objects: Phaser.GameObjects.GameObject[] = [];

  constructor(private readonly scene: Phaser.Scene) {}

  render(map: OfficeMapDefinition): void {
    this.renderExterior(map);
    this.renderFloors(map);
    this.renderRugs(map.rugs);
    this.renderWalls(map);
    this.renderFloorTexts(map);
  }

  destroy(): void {
    for (const object of this.objects) object.destroy();
    this.objects.length = 0;
  }

  private track<T extends Phaser.GameObjects.GameObject>(object: T): T {
    this.objects.push(object);
    return object;
  }

  private renderExterior(map: OfficeMapDefinition): void {
    const size = { width: map.width + EXTERIOR_MARGIN * 2, height: map.height + EXTERIOR_MARGIN * 2 };
    this.track(this.scene.add.rectangle(-EXTERIOR_MARGIN, -EXTERIOR_MARGIN, size.width, size.height, WORLD_COLORS.exterior))
      .setOrigin(0, 0)
      .setDepth(DEPTH.EXTERIOR - 1);
    this.track(this.scene.add.tileSprite(-EXTERIOR_MARGIN, -EXTERIOR_MARGIN, size.width, size.height, ensureExteriorTexture(this.scene, '#1f2633')))
      .setOrigin(0, 0)
      .setDepth(DEPTH.EXTERIOR);

    // Soft drop shadow under the building, rasterized small and upscaled (the blur comes for free).
    const key = `building-shadow-${map.key}`;
    const pad = 40;
    createCanvasTexture(this.scene, key, map.width + pad * 2, map.height + pad * 2, SHADOW_TEXTURE_SCALE, (ctx) => {
      ctx.filter = 'blur(12px)';
      ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
      for (const rect of map.footprint) ctx.fillRect(rect.x + pad - 4, rect.y + pad + 6, rect.width + 8, rect.height + 10);
    });
    this.track(this.scene.add.image(-pad, -pad, key)).setOrigin(0, 0).setScale(1 / SHADOW_TEXTURE_SCALE).setDepth(DEPTH.BUILDING_SHADOW);
  }

  private renderFloors(map: OfficeMapDefinition): void {
    const base = this.track(this.scene.add.graphics()).setDepth(DEPTH.FLOOR);
    const borders = this.track(this.scene.add.graphics()).setDepth(DEPTH.FLOOR + 1);
    for (const floor of map.floors) {
      const paint = FLOOR_PAINT[floor.style];
      base.fillStyle(paint.base, 1);
      base.fillRect(floor.bounds.x, floor.bounds.y, floor.bounds.width, floor.bounds.height);
      const pattern = FLOOR_PATTERNS[floor.style];
      if (pattern) {
        this.addPattern(floor, pattern);
      } else {
        // Carpets: an inset border reads as a defined zone without visual noise.
        borders.lineStyle(2, paint.line, 0.9);
        borders.strokeRect(floor.bounds.x + 6, floor.bounds.y + 6, floor.bounds.width - 12, floor.bounds.height - 12);
      }
    }
  }

  private addPattern(floor: FloorArea, pattern: FloorPattern): void {
    const { textureScale } = renderScaleOf(this.scene);
    const key = `floor-pattern-${floor.style.toLowerCase()}`;
    const line = toHex(FLOOR_PAINT[floor.style].line);
    createCanvasTexture(this.scene, key, pattern.width, pattern.height, textureScale, (ctx) => pattern.draw(ctx, line));
    const { x, y, width, height } = floor.bounds;
    this.track(this.scene.add.tileSprite(x, y, width, height, key))
      .setOrigin(0, 0)
      .setTileScale(1 / textureScale)
      .setDepth(DEPTH.FLOOR + 1);
  }

  private renderRugs(rugs: RugPlacement[]): void {
    const { textureScale } = renderScaleOf(this.scene);
    rugs.forEach((rug, index) => {
      const { width, height } = rug.bounds;
      const key = `rug-${index}-${Math.round(width)}x${Math.round(height)}-${rug.color.toString(16)}-${rug.pattern}`;
      createCanvasTexture(this.scene, key, width + 4, height + 4, textureScale, (ctx) => drawRug(ctx, rug, width, height));
      this.track(this.scene.add.image(rug.bounds.x - 1, rug.bounds.y - 1, key))
        .setOrigin(0, 0)
        .setScale(1 / textureScale)
        .setDepth(DEPTH.RUG);
    });
  }

  private renderWalls(map: OfficeMapDefinition): void {
    const graphics = this.track(this.scene.add.graphics()).setDepth(DEPTH.WALL);

    for (const door of map.doors) {
      const horizontal = door.from.y === door.to.y;
      const x0 = Math.min(door.from.x, door.to.x);
      const y0 = Math.min(door.from.y, door.to.y);
      const bounds: Bounds = horizontal
        ? { x: x0, y: y0 - 7, width: Math.abs(door.to.x - door.from.x), height: 14 }
        : { x: x0 - 7, y: y0, width: 14, height: Math.abs(door.to.y - door.from.y) };
      graphics.fillStyle(WORLD_COLORS.doorThreshold, 0.9);
      graphics.fillRect(bounds.x, bounds.y, bounds.width, bounds.height);
    }

    for (const wall of map.walls) {
      const paint = WALL_PAINT[wall.style];
      const bounds = wallBounds(wall);
      graphics.fillStyle(paint.fill, paint.fillAlpha);
      graphics.fillRect(bounds.x, bounds.y, bounds.width, bounds.height);
      const horizontal = wall.from.y === wall.to.y;
      graphics.lineStyle(wall.style === 'GLASS' ? 1.5 : 1, paint.highlight, paint.highlightAlpha);
      if (horizontal) {
        const lineY = wall.style === 'GLASS' ? bounds.y + bounds.height / 2 : bounds.y + 1;
        graphics.lineBetween(bounds.x, lineY, bounds.x + bounds.width, lineY);
      } else {
        const lineX = wall.style === 'GLASS' ? bounds.x + bounds.width / 2 : bounds.x + 1;
        graphics.lineBetween(lineX, bounds.y, lineX, bounds.y + bounds.height);
      }
    }
  }

  private renderFloorTexts(map: OfficeMapDefinition): void {
    const { textResolution } = renderScaleOf(this.scene);
    for (const floorText of map.floorTexts) {
      const text = this.track(
        // Thin spaces instead of setLetterSpacing: Phaser under-measures letter-spaced text and clips it.
        this.scene.add.text(floorText.x, floorText.y, [...floorText.text].join('  '), {
          fontFamily: '"Inter Variable", Inter, system-ui, sans-serif',
          fontSize: `${floorText.size}px`,
          fontStyle: '700',
          color: floorText.color,
          resolution: textResolution,
        }),
      );
      text.setOrigin(0.5).setAlpha(floorText.alpha).setDepth(DEPTH.FLOOR_TEXT);
    }
  }
}

function drawRug(ctx: CanvasRenderingContext2D, rug: RugPlacement, width: number, height: number): void {
  ctx.translate(1, 1);
  roundRect(ctx, 0, 1, width, height, 8);
  ctx.fillStyle = 'rgba(0, 0, 0, 0.06)';
  ctx.fill();
  roundRect(ctx, 0, 0, width, height, 8);
  ctx.fillStyle = toHex(rug.color);
  ctx.fill();
  if (rug.pattern === 'BORDERED') {
    roundRect(ctx, 6, 6, width - 12, height - 12, 5);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.28)';
    ctx.lineWidth = 2;
    ctx.stroke();
  } else if (rug.pattern === 'STRIPED') {
    ctx.save();
    roundRect(ctx, 0, 0, width, height, 8);
    ctx.clip();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
    for (let stripeX = 10; stripeX < width - 10; stripeX += 22) ctx.fillRect(stripeX, 6, 9, height - 12);
    ctx.restore();
  }
}
