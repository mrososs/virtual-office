import type { ActivityType } from '@virtual-office/shared';
import type Phaser from 'phaser';

import { ACTIVITY_META } from '@/shared/constants/activity-meta';

import { circle, createCanvasTexture, type Ctx } from './canvas-texture';
import { renderScaleOf } from './render-scale';

export const BADGE_SIZE = 16;

export function badgeTextureKey(activity: ActivityType): string {
  return `badge-${activity.toLowerCase()}`;
}

type GlyphDrawer = (ctx: Ctx, fill: string) => void;

const stroke = (ctx: Ctx, draw: () => void) => {
  ctx.beginPath();
  draw();
  ctx.stroke();
};

const GLYPHS: Record<ActivityType, GlyphDrawer> = {
  AVAILABLE: (ctx) =>
    stroke(ctx, () => {
      ctx.moveTo(4.8, 8.3);
      ctx.lineTo(7, 10.5);
      ctx.lineTo(11.3, 5.9);
    }),
  WORKING: (ctx) => {
    stroke(ctx, () => ctx.roundRect(4.6, 5, 6.8, 4.8, 0.8));
    stroke(ctx, () => {
      ctx.moveTo(3.4, 11.4);
      ctx.lineTo(12.6, 11.4);
    });
  },
  CODING: (ctx) => {
    stroke(ctx, () => {
      ctx.moveTo(6.4, 5);
      ctx.lineTo(3.9, 8);
      ctx.lineTo(6.4, 11);
    });
    stroke(ctx, () => {
      ctx.moveTo(9.6, 5);
      ctx.lineTo(12.1, 8);
      ctx.lineTo(9.6, 11);
    });
  },
  CODE_REVIEW: (ctx) => {
    stroke(ctx, () => ctx.ellipse(8, 8, 4.6, 2.9, 0, 0, Math.PI * 2));
    circle(ctx, 8, 8, 1.45, '#ffffff');
  },
  BUILDING: (ctx) => {
    stroke(ctx, () => ctx.arc(8, 8, 2.4, 0, Math.PI * 2));
    for (let index = 0; index < 6; index += 1) {
      const angle = (index / 6) * Math.PI * 2;
      stroke(ctx, () => {
        ctx.moveTo(8 + Math.cos(angle) * 3.6, 8 + Math.sin(angle) * 3.6);
        ctx.lineTo(8 + Math.cos(angle) * 5, 8 + Math.sin(angle) * 5);
      });
    }
  },
  BLOCKED: (ctx) => {
    stroke(ctx, () => {
      ctx.moveTo(8, 4.4);
      ctx.lineTo(8, 9);
    });
    circle(ctx, 8, 11.4, 0.95, '#ffffff');
  },
  MEETING: (ctx) => {
    stroke(ctx, () => ctx.roundRect(3.6, 5.6, 6.2, 4.8, 1));
    ctx.beginPath();
    ctx.moveTo(10.1, 8);
    ctx.lineTo(12.8, 6.1);
    ctx.lineTo(12.8, 9.9);
    ctx.closePath();
    ctx.fillStyle = '#ffffff';
    ctx.fill();
  },
  FOCUS: (ctx, fill) => {
    circle(ctx, 8, 8, 4.1, '#ffffff');
    circle(ctx, 9.9, 6.5, 3.4, fill);
  },
  BREAK: (ctx) => {
    stroke(ctx, () => ctx.roundRect(4.3, 6.6, 5.6, 4.8, 1.2));
    stroke(ctx, () => ctx.arc(10.6, 8.7, 1.3, -Math.PI / 2, Math.PI / 2));
    stroke(ctx, () => {
      ctx.moveTo(6.2, 3.6);
      ctx.lineTo(6.2, 5);
      ctx.moveTo(8, 3.6);
      ctx.lineTo(8, 5);
    });
  },
  OFFLINE: (ctx) =>
    stroke(ctx, () => {
      ctx.moveTo(5, 8);
      ctx.lineTo(11, 8);
    }),
  UNKNOWN: (ctx) => circle(ctx, 8, 8, 1.4, '#ffffff'),
};

export function ensureBadgeTextures(scene: Phaser.Scene): void {
  const scale = renderScaleOf(scene).textureScale * 1.5;
  for (const activity of Object.keys(GLYPHS) as ActivityType[]) {
    const fill = ACTIVITY_META[activity].color;
    createCanvasTexture(scene, badgeTextureKey(activity), BADGE_SIZE, BADGE_SIZE, scale, (ctx) => {
      ctx.save();
      ctx.shadowColor = 'rgba(15, 23, 42, 0.35)';
      ctx.shadowBlur = 2 * scale;
      ctx.shadowOffsetY = 0.6 * scale;
      circle(ctx, 8, 8, 7, fill);
      ctx.restore();
      ctx.beginPath();
      ctx.arc(8, 8, 7, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(255,255,255,0.95)';
      ctx.lineWidth = 1.1;
      ctx.stroke();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.35;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      GLYPHS[activity](ctx, fill);
    });
  }
}

export function badgeScale(scene: Phaser.Scene): number {
  return 1 / (renderScaleOf(scene).textureScale * 1.5);
}

export function ensureExteriorTexture(scene: Phaser.Scene, dotColor: string): string {
  const key = 'exterior-dots';
  createCanvasTexture(scene, key, 24, 24, 1, (ctx) => {
    circle(ctx, 12, 12, 1, dotColor);
  });
  return key;
}
