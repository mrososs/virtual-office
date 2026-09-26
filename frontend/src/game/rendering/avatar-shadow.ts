import type Phaser from 'phaser';

import { createCanvasTexture } from './canvas-texture';
import { renderScaleOf } from './render-scale';

/** Soft elliptical contact shadow shared by every avatar. */
export function ensureAvatarShadowTexture(scene: Phaser.Scene): string {
  const key = 'avatar-shadow';
  const { textureScale } = renderScaleOf(scene);
  createCanvasTexture(scene, key, 28, 10, textureScale, (ctx) => {
    ctx.translate(14, 5);
    ctx.scale(1, 0.36);
    const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, 13.5);
    gradient.addColorStop(0, 'rgba(15, 23, 42, 0.42)');
    gradient.addColorStop(0.6, 'rgba(15, 23, 42, 0.2)');
    gradient.addColorStop(1, 'rgba(15, 23, 42, 0)');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(0, 0, 13.5, 0, Math.PI * 2);
    ctx.fill();
  });
  return key;
}
