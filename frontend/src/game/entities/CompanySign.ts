import type Phaser from 'phaser';

import type { CompanyBranding } from '@/core/config/branding';
import type { WallSignPlacement } from '@/game/maps/office-map.types';
import { createCanvasTexture, fillRoundRect, withShadow, type Ctx } from '@/game/rendering/canvas-texture';
import { DEPTH } from '@/game/rendering/depth';
import { renderScaleOf } from '@/game/rendering/render-scale';

const FONT = '"Inter Variable", Inter, system-ui, sans-serif';
const PADDING_X = 10;
const GAP = 7;
const SHADOW_PAD = 6;

/**
 * Company signage mounted on a wall (the reception wall on the demo floor):
 * a dark panel with the logo and company name, rasterized once into a
 * texture. Purely decorative — no physics body, no input, not part of the
 * navigation grid — and it sits at wall depth, so people walk in front of it.
 * If the logo failed to load, the panel shows the company name alone.
 */
export class CompanySign {
  private readonly image: Phaser.GameObjects.Image;

  constructor(scene: Phaser.Scene, placement: WallSignPlacement, branding: CompanyBranding) {
    const logo = scene.textures.exists(branding.logoAssetKey) ? (scene.textures.get(branding.logoAssetKey).getSourceImage() as CanvasImageSource & { width: number; height: number }) : null;
    const { textureScale } = renderScaleOf(scene);
    const key = `company-sign-${placement.width}x${placement.height}-${logo ? 'logo' : 'text'}`;
    const width = placement.width + SHADOW_PAD * 2;
    const height = placement.height + SHADOW_PAD * 2;

    createCanvasTexture(scene, key, width, height, textureScale, (ctx) => {
      ctx.translate(SHADOW_PAD, SHADOW_PAD - 2);
      drawSign(ctx, placement.width, placement.height, branding, logo, textureScale);
    });

    this.image = scene.add
      .image(placement.x, placement.y + 2, key)
      .setScale(1 / textureScale)
      .setDepth(DEPTH.WALL_SIGN);
  }

  destroy(): void {
    this.image.destroy();
  }
}

function drawSign(
  ctx: Ctx,
  width: number,
  height: number,
  branding: CompanyBranding,
  logo: (CanvasImageSource & { width: number; height: number }) | null,
  scale: number,
): void {
  withShadow(ctx, scale, () => fillRoundRect(ctx, 0, 0, width, height, 4, '#151b28'), 5, 2.5, 0.35);
  const sheen = ctx.createLinearGradient(0, 0, 0, height);
  sheen.addColorStop(0, 'rgba(255,255,255,0.07)');
  sheen.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.beginPath();
  ctx.roundRect(0.5, 0.5, width - 1, height - 1, 3.5);
  ctx.fillStyle = sheen;
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.1)';
  ctx.lineWidth = 1;
  ctx.stroke();
  // Brand trim along the bottom edge and small wall mounts.
  fillRoundRect(ctx, 10, height - 3.2, width - 20, 1.6, 0.8, branding.accentColor);
  for (const [x, y] of [[4, 4], [width - 4, 4], [4, height - 4], [width - 4, height - 4]] as const) {
    ctx.beginPath();
    ctx.arc(x, y, 0.9, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,0.28)';
    ctx.fill();
  }

  const fontSize = Math.round(height * 0.44);
  ctx.font = `700 ${fontSize}px ${FONT}`;
  ctx.textBaseline = 'middle';
  const textWidth = ctx.measureText(branding.companyName).width;
  const logoHeight = height - 13;
  const logoWidth = logo && logo.height > 0 ? (logo.width / logo.height) * logoHeight : 0;
  const contentWidth = logo ? logoWidth + GAP + textWidth : textWidth;
  // Shrink (never stretch) if the content would not fit the panel.
  const fit = Math.min(1, (width - PADDING_X * 2) / contentWidth);
  const centerY = height / 2 - 0.8;

  ctx.save();
  ctx.translate(width / 2, centerY);
  ctx.scale(fit, fit);
  let x = -contentWidth / 2;
  if (logo) {
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(logo, x, -logoHeight / 2, logoWidth, logoHeight);
    x += logoWidth + GAP;
  }
  ctx.fillStyle = '#f5f7fa';
  ctx.fillText(branding.companyName, x, 0.5);
  ctx.restore();
}
