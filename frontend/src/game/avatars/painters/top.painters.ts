import { avatarColorHex, type TopStyleId } from '@virtual-office/shared';

import { CX, TORSO_HEIGHT, TORSO_TOP_Y, frontArms, sideArms } from '@/game/avatars/avatar-frame';
import type { LayerPainter, PaintContext } from '@/game/avatars/avatar.types';
import { circle, fillRoundRect, shade, tint, type Ctx } from '@/game/rendering/canvas-texture';

import { carve, carveArms, carveHead, line, polygon, strokeRoundRect, upperBody } from './paint-utils';

type Detail = (paint: PaintContext, color: string) => void;

interface TopSpec {
  sleeves: 'short' | 'long';
  /** Drawn before the torso (e.g. a hood behind the shoulders). */
  under?: Detail;
  /** Drawn on the torso, before the occlusion cut-outs. */
  details?: Detail;
}

const SLEEVE_LENGTH = { short: 4.6, long: 8.9 } as const;

/** Torso extents for the current view (the side view is narrower). */
function torsoOf(paint: PaintContext): { x: number; width: number; radius: number } {
  const { body, view } = paint;
  return view === 'left'
    ? { x: CX - body.sideHalf, width: body.sideHalf * 2, radius: 4.2 }
    : { x: CX - body.torsoHalf, width: body.torsoHalf * 2, radius: body.torsoRadius };
}

/** Runs `draw` clipped to the torso shape. */
function onTorso(paint: PaintContext, draw: (torso: { x: number; width: number }) => void): void {
  const torso = torsoOf(paint);
  paint.ctx.save();
  paint.ctx.beginPath();
  paint.ctx.roundRect(torso.x, TORSO_TOP_Y, torso.width, TORSO_HEIGHT, torso.radius);
  paint.ctx.clip();
  draw(torso);
  paint.ctx.restore();
}

function sleeve(ctx: Ctx, x: number, y: number, width: number, length: number, color: string, cuff: boolean): void {
  fillRoundRect(ctx, x - 0.2, y, width + 0.4, length, 1.7, color);
  if (cuff) fillRoundRect(ctx, x - 0.2, y + length - 1.2, width + 0.4, 1.2, 0.6, shade(color, 0.82));
}

function topPainter(spec: TopSpec): LayerPainter {
  return (paint, appearance) => {
    const color = avatarColorHex('topColor', appearance.topColor);
    const { ctx, view, body, pose } = paint;
    const length = SLEEVE_LENGTH[spec.sleeves];
    const cuff = spec.sleeves === 'long';

    upperBody(paint, () => {
      spec.under?.(paint, color);
      if (view === 'left') {
        const arms = sideArms(body, pose);
        sleeve(ctx, arms.back.x, arms.back.y, arms.back.width, length, shade(color, 0.72), cuff);
      } else {
        for (const arm of frontArms(body, pose)) sleeve(ctx, arm.x, arm.y, arm.width, length, shade(color, 0.84), cuff);
      }

      const torso = torsoOf(paint);
      fillRoundRect(ctx, torso.x, TORSO_TOP_Y, torso.width, TORSO_HEIGHT, torso.radius, color);
      onTorso(paint, (t) => {
        ctx.fillStyle = 'rgba(0,0,0,0.08)';
        ctx.fillRect(t.x, 29.6, t.width, 3);
      });
      strokeRoundRect(ctx, torso.x, TORSO_TOP_Y, torso.width, TORSO_HEIGHT, torso.radius);
      spec.details?.(paint, color);

      if (view === 'left') {
        // The near arm swings in front of the torso: cut it out, then put its sleeve back on top.
        carveArms(paint, { nearArm: true });
        const { front } = sideArms(body, pose);
        sleeve(ctx, front.x, front.y, front.width, length, shade(color, 0.84), cuff);
      } else {
        carveArms(paint, { nearArm: false });
      }
      carveHead(ctx);
    });
  };
}

const crewNeck = (ctx: Ctx, color: string, band: number) => {
  carve(ctx, () => {
    ctx.beginPath();
    ctx.ellipse(CX, 21.1, 2.7, 1.7, 0, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.beginPath();
  ctx.ellipse(CX, 21.1, 2.95, 1.95, 0, 0.05 * Math.PI, 0.95 * Math.PI);
  ctx.strokeStyle = shade(color, 0.76);
  ctx.lineWidth = band;
  ctx.stroke();
};

const vNeck = (ctx: Ctx, halfWidth: number, depth: number) =>
  carve(ctx, () => polygon(ctx, [[CX - halfWidth, 20.8], [CX, 21 + depth], [CX + halfWidth, 20.8]], '#000000'));

const tshirt: TopSpec = {
  sleeves: 'short',
  details: ({ ctx, view }, color) => {
    if (view === 'down') crewNeck(ctx, color, 0.7);
  },
};

const polo: TopSpec = {
  sleeves: 'short',
  details: ({ ctx, view }, color) => {
    const collar = tint(color, 0.2);
    if (view === 'down') {
      vNeck(ctx, 1.6, 2.3);
      polygon(ctx, [[CX - 3.7, 20.6], [CX - 0.2, 21.2], [CX - 2, 23.3]], collar);
      polygon(ctx, [[CX + 3.7, 20.6], [CX + 0.2, 21.2], [CX + 2, 23.3]], collar);
      line(ctx, CX, 23.4, CX, 26, shade(color, 0.76), 0.55);
      circle(ctx, CX, 24.3, 0.36, tint(color, 0.55));
      circle(ctx, CX, 25.5, 0.36, tint(color, 0.55));
    } else if (view === 'up') {
      fillRoundRect(ctx, CX - 3.6, 20.2, 7.2, 2, 1, collar);
    } else {
      polygon(ctx, [[CX - 3.2, 20.6], [CX + 0.6, 20.6], [CX - 1.6, 22.6]], collar);
    }
  },
};

const buttonShirt: TopSpec = {
  sleeves: 'long',
  details: ({ ctx, view }, color) => {
    const collar = tint(color, 0.28);
    if (view === 'down') {
      vNeck(ctx, 2, 3);
      polygon(ctx, [[CX - 3.5, 20.6], [CX - 0.3, 21.3], [CX - 2.1, 23.9]], collar);
      polygon(ctx, [[CX + 3.5, 20.6], [CX + 0.3, 21.3], [CX + 2.1, 23.9]], collar);
      line(ctx, CX, 24.1, CX, 32, shade(color, 0.78), 0.55);
      for (const y of [25.6, 27.8, 30]) circle(ctx, CX + 0.6, y, 0.38, tint(color, 0.6));
    } else if (view === 'up') {
      fillRoundRect(ctx, CX - 3.8, 20.1, 7.6, 2, 1, collar);
    } else {
      polygon(ctx, [[CX - 3, 20.6], [CX + 0.4, 20.6], [CX - 1.8, 23.3]], collar);
    }
  },
};

const sweater: TopSpec = {
  sleeves: 'long',
  details: (paint, color) => {
    const { ctx, view } = paint;
    onTorso(paint, (t) => {
      ctx.fillStyle = tint(color, 0.2);
      ctx.globalAlpha = 0.55;
      ctx.fillRect(t.x, 25, t.width, 1.2);
      ctx.globalAlpha = 1;
      ctx.fillStyle = shade(color, 0.82);
      ctx.fillRect(t.x, 30.6, t.width, 2);
      ctx.fillStyle = 'rgba(0,0,0,0.12)';
      for (let x = t.x + 0.9; x < t.x + t.width; x += 1.3) ctx.fillRect(x, 30.8, 0.35, 1.6);
    });
    if (view === 'down') crewNeck(ctx, color, 1.05);
  },
};

const hoodie: TopSpec = {
  sleeves: 'long',
  under: ({ ctx, view }, color) => {
    if (view === 'down') fillRoundRect(ctx, CX - 6.2, 17.6, 12.4, 6, 3, shade(color, 0.8));
  },
  details: (paint, color) => {
    const { ctx, view, body } = paint;
    if (view === 'down') {
      fillRoundRect(ctx, CX - 4.2, 26.8, 8.4, 3.8, 1.6, shade(color, 0.88));
      strokeRoundRect(ctx, CX - 4.2, 26.8, 8.4, 3.8, 1.6, 'rgba(0,0,0,0.14)', 0.5);
      const cord = tint(color, 0.55);
      line(ctx, CX - 1.5, 21.9, CX - 1.7, 25.4, cord, 0.6);
      line(ctx, CX + 1.5, 21.9, CX + 1.7, 25.4, cord, 0.6);
    } else if (view === 'up') {
      fillRoundRect(ctx, CX - 4.8, 20.3, 9.6, 5.8, 2.8, shade(color, 0.84));
      ctx.beginPath();
      ctx.arc(CX, 21.4, 3, 0.15 * Math.PI, 0.85 * Math.PI);
      ctx.strokeStyle = shade(color, 0.68);
      ctx.lineWidth = 0.6;
      ctx.stroke();
    } else {
      fillRoundRect(ctx, CX + 0.4, 17.8, 5.6, 6.4, 2.6, shade(color, 0.8));
      fillRoundRect(ctx, CX - body.sideHalf + 0.6, 26.8, 4.4, 3.6, 1.4, shade(color, 0.88));
    }
  },
};

const blazer: TopSpec = {
  sleeves: 'long',
  details: ({ ctx, view, body }, color) => {
    const lapel = shade(color, 0.72);
    if (view === 'down') {
      polygon(ctx, [[CX - 3, 21], [CX, 28.2], [CX + 3, 21]], '#eef1f5');
      vNeck(ctx, 1.2, 1.7);
      line(ctx, CX - 3.2, 21.1, CX - 0.2, 28.3, lapel, 1.15);
      line(ctx, CX + 3.2, 21.1, CX + 0.2, 28.3, lapel, 1.15);
      circle(ctx, CX, 29.4, 0.55, shade(color, 0.58));
      line(ctx, CX + 2.4, 27.4, CX + 4.4, 27.4, lapel, 0.55);
    } else if (view === 'up') {
      line(ctx, CX, 23.6, CX, 32.2, shade(color, 0.8), 0.5);
    } else {
      const front = CX - body.sideHalf;
      polygon(ctx, [[front + 0.3, 21.2], [front + 2, 21.2], [front + 0.9, 25.4]], '#eef1f5');
      line(ctx, front + 2, 21.3, front + 1.1, 28.4, lapel, 0.95);
    }
  },
};

/** Every catalog top must have a painter — the compiler enforces it. */
export const TOP_STYLES: Readonly<Record<TopStyleId, LayerPainter>> = {
  'top-tshirt': topPainter(tshirt),
  'top-polo': topPainter(polo),
  'top-shirt': topPainter(buttonShirt),
  'top-sweater': topPainter(sweater),
  'top-hoodie': topPainter(hoodie),
  'top-blazer': topPainter(blazer),
};
