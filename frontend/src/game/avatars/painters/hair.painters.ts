import { avatarColorHex, type HairStyleId } from '@virtual-office/shared';

import { CX, HEAD_CY, HEAD_R } from '@/game/avatars/avatar-frame';
import type { AvatarView, LayerPainter, PaintContext } from '@/game/avatars/avatar.types';
import { circle, ellipse, fillRoundRect, shade, type Ctx } from '@/game/rendering/canvas-texture';

import { carve, strokeCircle, upperBody } from './paint-utils';

export interface HairPainters {
  /** Drawn above clothing. */
  front: LayerPainter | null;
  /** Drawn behind the body (e.g. long hair behind the shoulders). */
  back: LayerPainter | null;
}

const HIGHLIGHT = 'rgba(255,255,255,0.14)';

/** Paints `draw(ctx, hairColor, view)` inside the upper-body bob. */
function hairPainter(draw: (ctx: Ctx, hair: string, view: AvatarView, paint: PaintContext) => void): LayerPainter {
  return (paint, appearance) => upperBody(paint, () => draw(paint.ctx, avatarColorHex('hairColor', appearance.hairColor), paint.view, paint));
}

/** A cap of hair over the skull, clipped at `bottomY` (plus an optional extra region). */
function hairCap(ctx: Ctx, color: string, bottomY: number, radiusBoost = 0.8, extraClip?: (ctx: Ctx) => void): void {
  ctx.save();
  ctx.beginPath();
  ctx.rect(CX - HEAD_R - 4, HEAD_CY - HEAD_R - 6, (HEAD_R + 4) * 2, bottomY - (HEAD_CY - HEAD_R - 6));
  extraClip?.(ctx);
  ctx.clip();
  circle(ctx, CX, HEAD_CY - 0.6, HEAD_R + radiusBoost, color);
  ctx.restore();
}

/** Side view: hair also covers the back of the head, down to `bottomOffset` below its center. */
function backOfHeadClip(bottomOffset: number) {
  return (ctx: Ctx) => ctx.rect(CX - 1.2, HEAD_CY - HEAD_R - 6, HEAD_R + 6, HEAD_R + 6 + bottomOffset);
}

/** Side view: keep the ear (body layer) visible through short hair. */
function carveEar(ctx: Ctx): void {
  carve(ctx, () => {
    ctx.beginPath();
    ctx.arc(CX + 1.6, HEAD_CY + 1.9, 2, 0, Math.PI * 2);
    ctx.fill();
  });
}

function shortCut(buzz: boolean, opacity = 1): LayerPainter {
  return hairPainter((ctx, hair, view) => {
    ctx.save();
    ctx.globalAlpha = opacity;
    const boost = buzz ? 0.2 : 0.8;
    if (view === 'up') {
      hairCap(ctx, hair, HEAD_CY + (buzz ? 4 : 5.5), boost);
    } else if (view === 'left') {
      hairCap(ctx, hair, HEAD_CY - (buzz ? 3.2 : 2.3), boost, backOfHeadClip(buzz ? 3.5 : 4.8));
    } else {
      hairCap(ctx, hair, HEAD_CY - (buzz ? 3.4 : 2.4), boost);
      if (!buzz) {
        fillRoundRect(ctx, CX - HEAD_R - 0.4, HEAD_CY - 4, 2.4, 5.4, 1.1, hair);
        fillRoundRect(ctx, CX + HEAD_R - 2, HEAD_CY - 4, 2.4, 5.4, 1.1, hair);
        ellipse(ctx, CX - 2.4, HEAD_CY - 3.3, 4.2, 2, hair, -0.35);
      }
    }
    ctx.restore();
    if (view === 'left') carveEar(ctx);
    if (!buzz) ellipse(ctx, CX - 2.6, HEAD_CY - 6.6, 2.6, 1.1, HIGHLIGHT, -0.4);
  });
}

function longCut(length: 'long' | 'bob'): LayerPainter {
  const sideLength = length === 'long' ? 10 : 7;
  return hairPainter((ctx, hair, view) => {
    if (view === 'up') {
      hairCap(ctx, hair, HEAD_CY + 6);
      fillRoundRect(ctx, CX - HEAD_R + 0.2, HEAD_CY, HEAD_R * 2 - 0.4, length === 'long' ? 14 : 7.5, 4, hair);
    } else if (view === 'left') {
      hairCap(ctx, hair, HEAD_CY - 1.6, 0.8, backOfHeadClip(sideLength - 1));
      fillRoundRect(ctx, CX - 0.8, HEAD_CY - 3, HEAD_R + 1.8, sideLength + 3, 3.5, hair);
    } else {
      hairCap(ctx, hair, HEAD_CY - 1.8);
      fillRoundRect(ctx, CX - HEAD_R - 1, HEAD_CY - 4, 3.2, sideLength + 3, 1.6, hair);
      fillRoundRect(ctx, CX + HEAD_R - 2.2, HEAD_CY - 4, 3.2, sideLength + 3, 1.6, hair);
      ellipse(ctx, CX + 2.2, HEAD_CY - 3.1, 4.6, 2.1, hair, 0.3);
    }
    ellipse(ctx, CX - 2.6, HEAD_CY - 6.6, 2.8, 1.1, HIGHLIGHT, -0.4);
  });
}

/** Long hair falling behind the shoulders. */
const longBack = hairPainter((ctx, hair, view) => {
  const color = shade(hair, 0.88);
  if (view === 'down') fillRoundRect(ctx, CX - HEAD_R - 1.2, HEAD_CY - 2, HEAD_R * 2 + 2.4, 15.5, 4.5, color);
  else if (view === 'left') fillRoundRect(ctx, CX - 0.5, HEAD_CY - 2, HEAD_R + 1.8, 15, 4.5, color);
});

const bun = hairPainter((ctx, hair, view) => {
  if (view === 'up') hairCap(ctx, hair, HEAD_CY + 5);
  else if (view === 'left') hairCap(ctx, hair, HEAD_CY - 2, 0.8, backOfHeadClip(4.5));
  else {
    hairCap(ctx, hair, HEAD_CY - 2.2);
    fillRoundRect(ctx, CX - HEAD_R - 0.4, HEAD_CY - 4, 2.4, 5, 1.1, hair);
    fillRoundRect(ctx, CX + HEAD_R - 2, HEAD_CY - 4, 2.4, 5, 1.1, hair);
  }
  const bunX = view === 'left' ? CX + 4.2 : CX;
  circle(ctx, bunX, HEAD_CY - HEAD_R - 1.1, 3.7, hair);
  circle(ctx, bunX - 1, HEAD_CY - HEAD_R - 2.1, 1.2, HIGHLIGHT);
});

const curly = hairPainter((ctx, hair, view) => {
  const bottom = view === 'up' ? HEAD_CY + 5 : HEAD_CY - 2;
  hairCap(ctx, hair, bottom, 1.2, view === 'left' ? backOfHeadClip(4.5) : undefined);
  const from = view === 'up' ? Math.PI * 0.95 : Math.PI * 1.08;
  const to = view === 'up' ? Math.PI * 2.05 : Math.PI * 1.92;
  for (let angle = from; angle <= to; angle += Math.PI / 7.5) {
    circle(ctx, CX + Math.cos(angle) * (HEAD_R + 0.4), HEAD_CY - 0.6 + Math.sin(angle) * (HEAD_R + 0.4), 3, hair);
  }
  if (view === 'left') {
    for (const dy of [-2, 1.5]) circle(ctx, CX + HEAD_R - 0.6, HEAD_CY + dy, 2.8, hair);
    carveEar(ctx);
  }
  circle(ctx, CX - 3, HEAD_CY - 7, 1.3, HIGHLIGHT);
});

const ponytail = hairPainter((ctx, hair, view) => {
  const tie = shade(hair, 0.62);
  if (view === 'up') {
    hairCap(ctx, hair, HEAD_CY + 5.5);
    fillRoundRect(ctx, CX - 1.9, HEAD_CY + 2.2, 3.8, 11.2, 1.9, hair);
    fillRoundRect(ctx, CX - 1.6, HEAD_CY + 1.6, 3.2, 1.4, 0.6, tie);
  } else if (view === 'left') {
    ellipse(ctx, CX + HEAD_R + 0.5, HEAD_CY + 3.6, 2.2, 6.2, hair, -0.22);
    hairCap(ctx, hair, HEAD_CY - 2.4, 0.6, backOfHeadClip(3.8));
    circle(ctx, CX + HEAD_R - 0.4, HEAD_CY - 2.2, 1.3, tie);
    carveEar(ctx);
  } else {
    hairCap(ctx, hair, HEAD_CY - 2.8, 0.6);
    fillRoundRect(ctx, CX - HEAD_R - 0.2, HEAD_CY - 4.2, 2, 4.6, 1, hair);
    fillRoundRect(ctx, CX + HEAD_R - 1.8, HEAD_CY - 4.2, 2, 4.6, 1, hair);
    ctx.beginPath();
    ctx.moveTo(CX + 1.2, HEAD_CY - HEAD_R - 0.2);
    ctx.lineTo(CX + 0.6, HEAD_CY - 4.4);
    ctx.strokeStyle = shade(hair, 0.7);
    ctx.lineWidth = 0.55;
    ctx.stroke();
  }
  ellipse(ctx, CX - 2.6, HEAD_CY - 6.6, 2.6, 1, HIGHLIGHT, -0.4);
});

/** A head wrap: fabric over the head and shoulders with the face (body layer) showing through. */
const wrap = hairPainter((ctx, fabric, view) => {
  const fold = shade(fabric, 0.8);
  fillRoundRect(ctx, CX - HEAD_R - 1.7, HEAD_CY - 1, HEAD_R * 2 + 3.4, 11.5, 5.5, fold);
  circle(ctx, CX, HEAD_CY - 0.4, HEAD_R + 1.5, fabric);
  strokeCircle(ctx, CX, HEAD_CY - 0.4, HEAD_R + 1.5);
  if (view === 'up') {
    ellipse(ctx, CX - 2.5, HEAD_CY - 6, 3, 1.2, 'rgba(255,255,255,0.14)', -0.4);
    return;
  }
  const faceX = view === 'left' ? CX - 2.4 : CX;
  const radiusX = view === 'left' ? 5.2 : 6.4;
  carve(ctx, () => {
    ctx.beginPath();
    ctx.ellipse(faceX, HEAD_CY + 1.4, radiusX, 7, 0, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.beginPath();
  ctx.ellipse(faceX, HEAD_CY + 1.4, radiusX, 7, 0, 0, Math.PI * 2);
  ctx.strokeStyle = fold;
  ctx.lineWidth = 0.9;
  ctx.stroke();
  ellipse(ctx, CX - 2.5, HEAD_CY - 7, 3, 1.1, 'rgba(255,255,255,0.16)', -0.4);
});

/** Every catalog hair style must have painters — the compiler enforces it. */
export const HAIR_STYLES: Readonly<Record<HairStyleId, HairPainters>> = {
  'hair-short': { front: shortCut(false), back: null },
  'hair-buzz': { front: shortCut(true), back: null },
  'hair-curly': { front: curly, back: null },
  'hair-long': { front: longCut('long'), back: longBack },
  'hair-bob': { front: longCut('bob'), back: null },
  'hair-bun': { front: bun, back: null },
  'hair-ponytail': { front: ponytail, back: null },
  'hair-wrap': { front: wrap, back: null },
  'hair-shaved': { front: shortCut(true, 0.32), back: null },
};
