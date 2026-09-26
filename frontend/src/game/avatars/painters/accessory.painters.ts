import type { AccessoryId } from '@virtual-office/shared';

import { COMPANY_BRANDING } from '@/core/config/branding';
import { CX, HEAD_CY, HEAD_R } from '@/game/avatars/avatar-frame';
import type { AvatarView, LayerPainter, PaintContext } from '@/game/avatars/avatar.types';
import { fillRoundRect, type Ctx } from '@/game/rendering/canvas-texture';

import { line, strokeRoundRect, upperBody } from './paint-utils';

const FRAME = '#2a2f3b';
const EYE_Y = HEAD_CY + 1.5;

function accessoryPainter(draw: (ctx: Ctx, view: AvatarView, paint: PaintContext) => void): LayerPainter {
  return (paint) => upperBody(paint, () => draw(paint.ctx, paint.view, paint));
}

type LensShape = (ctx: Ctx, cx: number, cy: number) => void;

const roundLens: LensShape = (ctx, cx, cy) => {
  ctx.moveTo(cx + 2.15, cy);
  ctx.arc(cx, cy, 2.15, 0, Math.PI * 2);
};

const squareLens: LensShape = (ctx, cx, cy) => ctx.roundRect(cx - 2.2, cy - 1.65, 4.4, 3.3, 0.9);

function glasses(lens: LensShape, tint: string): LayerPainter {
  return accessoryPainter((ctx, view) => {
    if (view === 'up') return;
    const centers = view === 'left' ? [CX - 4.9] : [CX - 3.4, CX + 3.4];
    ctx.beginPath();
    for (const cx of centers) lens(ctx, cx, EYE_Y);
    ctx.fillStyle = tint;
    ctx.fill();
    ctx.strokeStyle = FRAME;
    ctx.lineWidth = 0.75;
    ctx.stroke();
    if (view === 'left') {
      line(ctx, CX - 2.8, EYE_Y - 0.5, CX + 1.2, EYE_Y - 0.6, FRAME, 0.6);
      return;
    }
    line(ctx, CX - 1.25, EYE_Y - 0.4, CX + 1.25, EYE_Y - 0.4, FRAME, 0.6);
    line(ctx, CX - 5.6, EYE_Y - 0.5, CX - HEAD_R + 0.4, EYE_Y - 0.9, FRAME, 0.6);
    line(ctx, CX + 5.6, EYE_Y - 0.5, CX + HEAD_R - 0.4, EYE_Y - 0.9, FRAME, 0.6);
  });
}

const sunglasses = accessoryPainter((ctx, view) => {
  if (view === 'up') return;
  const centers = view === 'left' ? [CX - 4.9] : [CX - 3.4, CX + 3.4];
  ctx.beginPath();
  for (const cx of centers) ctx.roundRect(cx - 2.3, EYE_Y - 1.6, 4.6, 3.2, 1.1);
  ctx.fillStyle = '#151a23';
  ctx.fill();
  for (const cx of centers) line(ctx, cx - 1.2, EYE_Y - 0.8, cx - 0.2, EYE_Y - 0.8, 'rgba(255,255,255,0.45)', 0.5);
  if (view === 'left') line(ctx, CX - 2.6, EYE_Y - 0.6, CX + 1.2, EYE_Y - 0.7, '#151a23', 0.7);
  else {
    line(ctx, CX - 1.1, EYE_Y - 0.6, CX + 1.1, EYE_Y - 0.6, '#151a23', 0.8);
    line(ctx, CX - 5.7, EYE_Y - 0.6, CX - HEAD_R + 0.4, EYE_Y - 1, '#151a23', 0.7);
    line(ctx, CX + 5.7, EYE_Y - 0.6, CX + HEAD_R - 0.4, EYE_Y - 1, '#151a23', 0.7);
  }
});

const headphones = accessoryPainter((ctx, view) => {
  const band = '#2d3340';
  const cup = '#1f2430';
  if (view === 'left') {
    ctx.beginPath();
    ctx.moveTo(CX + 1.7, HEAD_CY - 0.6);
    ctx.quadraticCurveTo(CX + 2.8, HEAD_CY - HEAD_R - 2, CX - 1.4, HEAD_CY - HEAD_R - 1.3);
    ctx.strokeStyle = band;
    ctx.lineWidth = 1.7;
    ctx.lineCap = 'round';
    ctx.stroke();
    fillRoundRect(ctx, CX + 0.1, HEAD_CY - 0.9, 3.3, 5.4, 1.4, cup);
    fillRoundRect(ctx, CX + 0.9, HEAD_CY - 0.2, 1.7, 4, 0.8, '#4b5563');
    return;
  }
  ctx.beginPath();
  ctx.arc(CX, HEAD_CY - 0.4, HEAD_R + 1.4, Math.PI * 1.06, Math.PI * 1.94);
  ctx.strokeStyle = band;
  ctx.lineWidth = 1.7;
  ctx.lineCap = 'round';
  ctx.stroke();
  for (const side of [-1, 1] as const) {
    const x = side < 0 ? CX - HEAD_R - 2.2 : CX + HEAD_R - 0.9;
    fillRoundRect(ctx, x, HEAD_CY - 1, 3.1, 5.3, 1.3, cup);
    strokeRoundRect(ctx, x, HEAD_CY - 1, 3.1, 5.3, 1.3, 'rgba(255,255,255,0.12)', 0.5);
  }
});

const lanyard = accessoryPainter((ctx, view, { body }) => {
  const cord = COMPANY_BRANDING.accentColor;
  if (view === 'up') {
    ctx.beginPath();
    ctx.moveTo(CX - 3, 21);
    ctx.quadraticCurveTo(CX, 22.6, CX + 3, 21);
    ctx.strokeStyle = cord;
    ctx.lineWidth = 0.65;
    ctx.stroke();
    return;
  }
  const badge = (x: number, y: number, width: number, height: number) => {
    fillRoundRect(ctx, x, y, width, height, 0.6, '#f8fafc');
    ctx.fillStyle = cord;
    ctx.fillRect(x, y, width, 1.1);
    strokeRoundRect(ctx, x, y, width, height, 0.6, 'rgba(17,22,33,0.35)', 0.45);
  };
  if (view === 'left') {
    const front = CX - body.sideHalf;
    line(ctx, CX - 0.6, 20.9, front + 1.6, 25.8, cord, 0.6);
    badge(front + 0.2, 25.6, 2.4, 3.8);
    return;
  }
  line(ctx, CX - 2.3, 21.3, CX - 0.4, 26, cord, 0.65);
  line(ctx, CX + 2.3, 21.3, CX + 0.4, 26, cord, 0.65);
  badge(CX - 1.7, 25.7, 3.4, 4.3);
});

/** Every catalog accessory must have a painter — the compiler enforces it. */
export const ACCESSORY_STYLES: Readonly<Record<AccessoryId, LayerPainter>> = {
  'acc-glasses-round': glasses(roundLens, 'rgba(186, 215, 255, 0.24)'),
  'acc-glasses-square': glasses(squareLens, 'rgba(186, 215, 255, 0.24)'),
  'acc-sunglasses': sunglasses,
  'acc-headphones': headphones,
  'acc-lanyard': lanyard,
};
