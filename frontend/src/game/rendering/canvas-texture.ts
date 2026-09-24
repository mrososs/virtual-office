import type Phaser from 'phaser';

export type Ctx = CanvasRenderingContext2D;

/**
 * Draws into a new canvas texture at `scale`x resolution. `draw` works in
 * logical (unscaled) pixels. Returns false if the key already existed.
 */
export function createCanvasTexture(
  scene: Phaser.Scene,
  key: string,
  logicalWidth: number,
  logicalHeight: number,
  scale: number,
  draw: (ctx: Ctx) => void,
): Phaser.Textures.CanvasTexture | null {
  if (scene.textures.exists(key)) return null;
  const texture = scene.textures.createCanvas(key, Math.ceil(logicalWidth * scale), Math.ceil(logicalHeight * scale));
  if (!texture) return null;
  const ctx = texture.getContext();
  ctx.save();
  ctx.scale(scale, scale);
  draw(ctx);
  ctx.restore();
  texture.refresh();
  return texture;
}

export function roundRect(ctx: Ctx, x: number, y: number, width: number, height: number, radius: number): void {
  ctx.beginPath();
  ctx.roundRect(x, y, width, height, Math.min(radius, width / 2, height / 2));
}

export function fillRoundRect(ctx: Ctx, x: number, y: number, width: number, height: number, radius: number, color: string): void {
  roundRect(ctx, x, y, width, height, radius);
  ctx.fillStyle = color;
  ctx.fill();
}

export function circle(ctx: Ctx, cx: number, cy: number, radius: number, color: string): void {
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();
}

export function ellipse(ctx: Ctx, cx: number, cy: number, rx: number, ry: number, color: string, rotation = 0): void {
  ctx.beginPath();
  ctx.ellipse(cx, cy, rx, ry, rotation, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();
}

/** Soft drop shadow for whatever is drawn inside `body`. Blur is in device px, so it is multiplied by `scale`. */
export function withShadow(ctx: Ctx, scale: number, body: () => void, blur = 3, offsetY = 1.5, alpha = 0.22): void {
  ctx.save();
  ctx.shadowColor = `rgba(15, 23, 42, ${alpha})`;
  ctx.shadowBlur = blur * scale;
  ctx.shadowOffsetY = offsetY * scale;
  body();
  ctx.restore();
}

/** Multiplies each RGB channel of a #rrggbb color by `factor` (0.8 darker, 1.2 lighter). */
export function shade(hex: string, factor: number): string {
  const value = Number.parseInt(hex.slice(1), 16);
  const channel = (shift: number) => Math.max(0, Math.min(255, Math.round(((value >> shift) & 0xff) * factor)));
  return `#${[16, 8, 0].map((shift) => channel(shift).toString(16).padStart(2, '0')).join('')}`;
}

/** Blends a #rrggbb color toward white by `amount` (0..1). */
export function tint(hex: string, amount: number): string {
  const value = Number.parseInt(hex.slice(1), 16);
  const channel = (shift: number) => {
    const c = (value >> shift) & 0xff;
    return Math.round(c + (255 - c) * amount);
  };
  return `#${[16, 8, 0].map((shift) => channel(shift).toString(16).padStart(2, '0')).join('')}`;
}
