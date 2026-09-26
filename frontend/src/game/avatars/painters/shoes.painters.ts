import type { ShoesStyleId } from '@virtual-office/shared';

import { frontLegs, sideLegs } from '@/game/avatars/avatar-frame';
import type { LayerPainter } from '@/game/avatars/avatar.types';
import { fillRoundRect, shade } from '@/game/rendering/canvas-texture';

interface ShoeLook {
  upper: string;
  sole?: string;
  toe?: string;
  /** Boots are taller than the default 2.3 px. */
  height?: number;
}

/** Shoes sit over the trouser hems; their color is part of the style. */
function shoesPainter(look: ShoeLook): LayerPainter {
  const height = look.height ?? 2.3;
  return ({ ctx, view, body, pose }) => {
    const shoe = (x: number, bottom: number, width: number, upper: string, toeOnLeft: boolean) => {
      const y = bottom - height;
      fillRoundRect(ctx, x, y, width, height, 1.1, upper);
      if (look.toe) {
        if (toeOnLeft) fillRoundRect(ctx, x, y + 0.2, 1.7, height - 0.2, 0.8, look.toe);
        else if (view === 'down') fillRoundRect(ctx, x + 0.3, y + height - 1.2, width - 0.6, 1.2, 0.6, look.toe);
      }
      if (look.sole) fillRoundRect(ctx, x + 0.2, bottom - 0.6, width - 0.4, 0.6, 0.3, look.sole);
    };

    if (view === 'left') {
      const legs = sideLegs(body, pose);
      shoe(legs.back.x - 1.2, 39.6, legs.back.width + 0.8, shade(look.upper, 0.8), true);
      shoe(legs.front.x - 1.3, 39.7 - legs.front.lift, legs.front.width + 0.9, look.upper, true);
      return;
    }
    for (const leg of frontLegs(body, pose)) shoe(leg.x - 0.4, 39.7 - leg.lift, leg.width + 0.8, look.upper, false);
  };
}

/** Every catalog shoe style must have a painter — the compiler enforces it. */
export const SHOES_STYLES: Readonly<Record<ShoesStyleId, LayerPainter>> = {
  'shoes-classic': shoesPainter({ upper: '#232833' }),
  'shoes-sneakers': shoesPainter({ upper: '#eef0f4', sole: '#8b95a7', height: 2.4 }),
  'shoes-boots': shoesPainter({ upper: '#6b4a2f', sole: '#3a2618', height: 3.4 }),
  'shoes-canvas': shoesPainter({ upper: '#d9383e', sole: '#f4f4f5', toe: '#f4f4f5', height: 2.4 }),
};
