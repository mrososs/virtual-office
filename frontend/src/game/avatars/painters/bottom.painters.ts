import { avatarColorHex, type BottomStyleId } from '@virtual-office/shared';

import { ANKLE_Y, CX, WAIST_Y, frontLegs, sideLegs, type LegRect } from '@/game/avatars/avatar-frame';
import type { LayerPainter, PaintContext } from '@/game/avatars/avatar.types';
import { fillRoundRect, shade, tint } from '@/game/rendering/canvas-texture';

import { carveArms, line, polygon, upperBody } from './paint-utils';

type LegDrawer = (paint: PaintContext, leg: LegRect, color: string, near: boolean) => void;

/** Drawn below the torso (which covers the waistband) and above the skin legs. */
function bottomPainter(drawLeg: LegDrawer, drawHips: (paint: PaintContext, color: string) => void = hips): LayerPainter {
  return (paint, appearance) => {
    const base = avatarColorHex('bottomColor', appearance.bottomColor);
    const { view, body, pose } = paint;
    if (view === 'left') {
      const legs = sideLegs(body, pose);
      drawLeg(paint, legs.back, shade(base, 0.76), false);
      drawHips(paint, base);
      drawLeg(paint, legs.front, base, true);
    } else {
      drawHips(paint, base);
      for (const leg of frontLegs(body, pose)) drawLeg(paint, leg, base, true);
    }
    // Hands hang in front of the hips.
    upperBody(paint, () => carveArms(paint, { nearArm: false }));
  };
}

function hips({ ctx, view, body }: PaintContext, color: string): void {
  if (view === 'left') {
    fillRoundRect(ctx, CX - body.sideHalf + 0.8, WAIST_Y, body.sideHalf * 2 - 1.6, 3.2, 1.2, color);
    return;
  }
  ctx.fillStyle = color;
  ctx.fillRect(CX - body.legGap - body.legWidth, WAIST_Y, (body.legGap + body.legWidth) * 2, 3);
}

const legHeight = (leg: LegRect) => ANKLE_Y - WAIST_Y - leg.lift;

const trousers: LegDrawer = ({ ctx, view }, leg, color) => {
  fillRoundRect(ctx, leg.x, WAIST_Y, leg.width, legHeight(leg), 1.4, color);
  if (view === 'down') line(ctx, leg.x + leg.width / 2, 33.6, leg.x + leg.width / 2, ANKLE_Y - leg.lift - 1, 'rgba(0,0,0,0.13)', 0.45);
};

const jeans: LegDrawer = (paint, leg, color, near) => {
  const { ctx, view } = paint;
  fillRoundRect(ctx, leg.x, WAIST_Y, leg.width, legHeight(leg), 1.4, color);
  const stitch = tint(color, 0.35);
  if (view !== 'left') {
    const outer = leg.x < CX ? leg.x + 0.55 : leg.x + leg.width - 0.55;
    line(ctx, outer, 32.6, outer, ANKLE_Y - leg.lift - 1.6, stitch, 0.35);
  }
  if (near || view !== 'left') fillRoundRect(ctx, leg.x - 0.1, ANKLE_Y - leg.lift - 1.5, leg.width + 0.2, 1.2, 0.5, tint(color, 0.16));
};

const joggers: LegDrawer = ({ ctx }, leg, color) => {
  const bottom = ANKLE_Y - leg.lift;
  polygon(
    ctx,
    [
      [leg.x - 0.1, WAIST_Y],
      [leg.x + leg.width + 0.1, WAIST_Y],
      [leg.x + leg.width - 0.4, bottom - 1],
      [leg.x + 0.4, bottom - 1],
    ],
    color,
  );
  fillRoundRect(ctx, leg.x + 0.35, bottom - 1.9, leg.width - 0.7, 1.9, 0.8, shade(color, 0.78));
};

const shorts: LegDrawer = ({ ctx, view }, leg, color) => {
  const flare = leg.x < CX - 0.5 ? -0.4 : 0.4;
  const x = view === 'left' ? leg.x - 0.2 : leg.x + Math.min(0, flare);
  const width = leg.width + (view === 'left' ? 0.5 : 0.4);
  fillRoundRect(ctx, x, WAIST_Y, width, 4.9, 1.2, color);
  fillRoundRect(ctx, x, WAIST_Y + 4.1, width, 0.8, 0.4, shade(color, 0.8));
};

/** A skirt is one shape, not two legs: drawn as the hips, with no separate leg pieces. */
function skirtHips({ ctx, view, body, pose }: PaintContext, color: string): void {
  const hem = 36;
  if (view === 'left') {
    polygon(
      ctx,
      [
        [CX - body.sideHalf + 0.6, WAIST_Y],
        [CX + body.sideHalf - 0.6, WAIST_Y],
        [CX + body.sideHalf + 0.9 - pose.stride * 0.2, hem],
        [CX - body.sideHalf - 1.3 + pose.stride * 0.35, hem],
      ],
      color,
    );
    return;
  }
  const waist = body.legGap + body.legWidth + 0.3;
  const flare = body.torsoHalf + 1.1;
  const sway = pose.armSwing * 0.35;
  polygon(ctx, [[CX - waist, WAIST_Y], [CX + waist, WAIST_Y], [CX + flare + sway, hem], [CX - flare + sway, hem]], color);
  ctx.fillStyle = shade(color, 0.8);
  ctx.fillRect(CX - flare + sway + 0.2, hem - 0.8, flare * 2 - 0.4, 0.8);
  line(ctx, CX - 2 + sway * 0.5, 32.4, CX - 2.8 + sway, hem - 1, 'rgba(0,0,0,0.12)', 0.45);
  line(ctx, CX + 2 + sway * 0.5, 32.4, CX + 2.8 + sway, hem - 1, 'rgba(0,0,0,0.12)', 0.45);
}

/** Every catalog bottom must have a painter — the compiler enforces it. */
export const BOTTOM_STYLES: Readonly<Record<BottomStyleId, LayerPainter>> = {
  'bottom-pants': bottomPainter(trousers),
  'bottom-jeans': bottomPainter(jeans),
  'bottom-joggers': bottomPainter(joggers),
  'bottom-shorts': bottomPainter(shorts),
  'bottom-skirt': bottomPainter(() => undefined, skirtHips),
};
