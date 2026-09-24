import type Phaser from 'phaser';

import { createCanvasTexture, roundRect } from './canvas-texture';
import { renderScaleOf } from './render-scale';

/**
 * Cached, pre-rasterized UI shapes (pills, chips, rings, dots).
 *
 * Phaser re-tessellates vector Graphics every frame, and rounded rects with
 * strokes are expensive: dozens of label backgrounds cost ~17 ms/frame on an
 * integrated GPU. These shapes are static between (rare) content changes, so
 * they are drawn once into canvas textures keyed by style + size and rendered
 * as plain image quads.
 */
export type PillStyle =
  | 'LABEL'
  | 'LABEL_DIMMED'
  | 'LABEL_LOCAL'
  | 'LABEL_LIVE'
  | 'CHIP'
  | 'CHIP_HOVER'
  | 'CHIP_SELECTED'
  | 'SIGN_LIVE'
  | 'SIGN_SOON'
  | 'TOOLTIP';

interface PillPaint {
  fill: string;
  border: string | null;
  borderWidth: number;
  radius: number | 'round';
}

const PILL_PAINT: Record<PillStyle, PillPaint> = {
  LABEL: { fill: 'rgba(21, 25, 34, 0.88)', border: 'rgba(255, 255, 255, 0.08)', borderWidth: 1, radius: 'round' },
  LABEL_DIMMED: { fill: 'rgba(21, 25, 34, 0.7)', border: 'rgba(255, 255, 255, 0.06)', borderWidth: 1, radius: 'round' },
  LABEL_LOCAL: { fill: 'rgba(21, 25, 34, 0.9)', border: 'rgba(124, 131, 255, 0.9)', borderWidth: 1, radius: 'round' },
  LABEL_LIVE: { fill: 'rgba(21, 25, 34, 0.9)', border: 'rgba(34, 197, 94, 0.85)', borderWidth: 1, radius: 'round' },
  CHIP: { fill: 'rgba(255, 255, 255, 0.86)', border: 'rgba(15, 23, 42, 0.1)', borderWidth: 1, radius: 6 },
  CHIP_HOVER: { fill: 'rgba(255, 255, 255, 0.98)', border: 'rgba(15, 23, 42, 0.14)', borderWidth: 1, radius: 6 },
  CHIP_SELECTED: { fill: 'rgba(255, 255, 255, 0.98)', border: 'rgba(124, 131, 255, 0.95)', borderWidth: 1.2, radius: 6 },
  SIGN_LIVE: { fill: 'rgba(21, 25, 34, 0.94)', border: 'rgba(239, 68, 68, 0.6)', borderWidth: 1, radius: 8 },
  SIGN_SOON: { fill: 'rgba(21, 25, 34, 0.94)', border: 'rgba(245, 158, 11, 0.6)', borderWidth: 1, radius: 8 },
  TOOLTIP: { fill: 'rgba(21, 25, 34, 0.94)', border: null, borderWidth: 0, radius: 6 },
};

/** Returns a texture key for a pill of `width`×`height` logical px; draws it on first use. */
export function ensurePillTexture(scene: Phaser.Scene, style: PillStyle, width: number, height: number): string {
  const w = Math.max(4, Math.ceil(width));
  const h = Math.max(4, Math.ceil(height));
  const key = `pill-${style.toLowerCase()}-${w}x${h}`;
  const paint = PILL_PAINT[style];
  const radius = paint.radius === 'round' ? Math.min(h / 2, 9) : paint.radius;
  createCanvasTexture(scene, key, w, h, renderScaleOf(scene).textureScale, (ctx) => {
    const inset = paint.borderWidth / 2;
    roundRect(ctx, inset, inset, w - paint.borderWidth, h - paint.borderWidth, radius);
    ctx.fillStyle = paint.fill;
    ctx.fill();
    if (paint.border) {
      ctx.strokeStyle = paint.border;
      ctx.lineWidth = paint.borderWidth;
      ctx.stroke();
    }
  });
  return key;
}

/** White nameplate with a colored stripe on the left (desk ownership). */
export function ensurePlateTexture(scene: Phaser.Scene, width: number, accent: string): string {
  const w = Math.max(8, Math.ceil(width));
  const key = `plate-${accent.replace('#', '')}-${w}`;
  createCanvasTexture(scene, key, w, 11, renderScaleOf(scene).textureScale, (ctx) => {
    roundRect(ctx, 0, 0, w, 11, 3);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
    ctx.fill();
    ctx.save();
    roundRect(ctx, 0, 0, w, 11, 3);
    ctx.clip();
    ctx.fillStyle = accent;
    ctx.fillRect(0, 0, 3, 11);
    ctx.restore();
  });
  return key;
}

/** Small white circle, tinted per use (status dots). */
export function ensureDotTexture(scene: Phaser.Scene): string {
  const key = 'ui-dot';
  createCanvasTexture(scene, key, 8, 8, renderScaleOf(scene).textureScale, (ctx) => {
    ctx.beginPath();
    ctx.arc(4, 4, 3.6, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
  });
  return key;
}

/** Thin white ring, tinted per use (the "live" halo around a status dot). */
export function ensureDotRingTexture(scene: Phaser.Scene): string {
  const key = 'ui-dot-ring';
  createCanvasTexture(scene, key, 12, 12, renderScaleOf(scene).textureScale, (ctx) => {
    ctx.beginPath();
    ctx.arc(6, 6, 5, 0, Math.PI * 2);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    ctx.stroke();
  });
  return key;
}

export type AvatarRingStyle = 'SELECTED' | 'HOVER' | 'NEARBY' | 'LOCAL';

/** Ellipses drawn under an avatar's feet for selection / hover / proximity / "this is you". */
export function ensureAvatarRingTexture(scene: Phaser.Scene, style: AvatarRingStyle): string {
  const key = `avatar-ring-${style.toLowerCase()}`;
  createCanvasTexture(scene, key, 40, 18, renderScaleOf(scene).textureScale, (ctx) => {
    const cx = 20;
    const cy = 9;
    ctx.beginPath();
    if (style === 'SELECTED') {
      ctx.ellipse(cx, cy, 18, 7.5, 0, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(124, 131, 255, 0.22)';
      ctx.fill();
      ctx.strokeStyle = '#7c83ff';
      ctx.lineWidth = 2;
    } else if (style === 'LOCAL') {
      ctx.ellipse(cx, cy, 15, 6, 0, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(124, 131, 255, 0.75)';
      ctx.lineWidth = 1.5;
    } else {
      ctx.ellipse(cx, cy, 16, 6.5, 0, 0, Math.PI * 2);
      ctx.strokeStyle = style === 'HOVER' ? 'rgba(255, 255, 255, 0.9)' : 'rgba(255, 255, 255, 0.55)';
      ctx.lineWidth = 1.5;
    }
    ctx.stroke();
  });
  return key;
}

export function uiTextureScale(scene: Phaser.Scene): number {
  return 1 / renderScaleOf(scene).textureScale;
}
