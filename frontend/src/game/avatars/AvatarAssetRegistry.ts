import {
  DEFAULT_AVATAR_APPEARANCE,
  type AccessoryId,
  type AvatarAppearance,
  type BottomStyleId,
  type HairStyleId,
  type ShoesStyleId,
  type TopStyleId,
} from '@virtual-office/shared';

import type { AvatarLayerSlot, AvatarLayerSpec, LayerBand, LayerPainter } from './avatar.types';
import { ACCESSORY_STYLES } from './painters/accessory.painters';
import { paintBody } from './painters/body.painter';
import { BOTTOM_STYLES } from './painters/bottom.painters';
import { HAIR_STYLES, type HairPainters } from './painters/hair.painters';
import { SHOES_STYLES } from './painters/shoes.painters';
import { TOP_STYLES } from './painters/top.painters';

/**
 * Knows which cosmetic assets exist and how each one is drawn. The option
 * list itself (ids, labels, colors) is `AVATAR_CATALOG` in `shared`, so the
 * backend validates against the same data; this registry pairs every catalog
 * id with a painter (see painters/*), and the painter maps are typed with the
 * catalog's id unions, so a catalog option without artwork does not compile.
 *
 * Framework-free: used by Phaser (layer textures) and the Vue creator preview.
 */

/** Back to front. The Phaser avatar keeps exactly one sprite per slot in this order. */
export const AVATAR_LAYER_ORDER: readonly AvatarLayerSlot[] = ['hairBack', 'body', 'bottom', 'shoes', 'top', 'hair', 'accessory'];

/**
 * Vertical slice of the frame each layer can draw into. Tight bands keep the
 * generated sheets small (hair never needs the feet, shoes never the head).
 */
export const AVATAR_LAYER_BANDS: Readonly<Record<AvatarLayerSlot, LayerBand>> = {
  hairBack: { top: -2, bottom: 30 },
  body: { top: 2, bottom: 41 },
  bottom: { top: 29, bottom: 40 },
  shoes: { top: 34, bottom: 41 },
  top: { top: 12, bottom: 34 },
  hair: { top: -2, bottom: 30 },
  accessory: { top: 1, bottom: 33 },
};

function lookup<Id extends string, T>(table: Readonly<Record<Id, T>>, id: string | null, fallback: Id): T {
  return (id !== null && Object.prototype.hasOwnProperty.call(table, id) ? table[id as Id] : undefined) ?? table[fallback];
}

const hairOf = (id: string): HairPainters => lookup(HAIR_STYLES, id, DEFAULT_AVATAR_APPEARANCE.hairStyle as HairStyleId);

function layer(slot: AvatarLayerSlot, key: string, paint: LayerPainter): AvatarLayerSpec {
  return { slot, key: `avatar:${slot}:${key}`, band: AVATAR_LAYER_BANDS[slot], paint };
}

/**
 * The layers that make up `appearance`, indexed like `AVATAR_LAYER_ORDER`
 * (`null` = the slot is empty, e.g. no accessory). Keys only contain the
 * inputs a layer actually depends on, so e.g. everyone with short brown hair
 * shares one hair texture regardless of their clothes.
 * Expects a normalized appearance; unknown ids still fall back safely.
 */
export function resolveAvatarLayers(appearance: AvatarAppearance): Array<AvatarLayerSpec | null> {
  const { bodyType, skinTone, hairStyle, hairColor, topStyle, topColor, bottomStyle, bottomColor, shoesStyle, accessory } = appearance;
  const hair = hairOf(hairStyle);
  const layers: Record<AvatarLayerSlot, AvatarLayerSpec | null> = {
    hairBack: hair.back ? layer('hairBack', `${hairStyle}:${hairColor}`, hair.back) : null,
    body: layer('body', `${bodyType}:${skinTone}`, paintBody),
    bottom: layer('bottom', `${bottomStyle}:${bottomColor}:${bodyType}`, lookup(BOTTOM_STYLES, bottomStyle, DEFAULT_AVATAR_APPEARANCE.bottomStyle as BottomStyleId)),
    shoes: layer('shoes', `${shoesStyle}:${bodyType}`, lookup(SHOES_STYLES, shoesStyle, DEFAULT_AVATAR_APPEARANCE.shoesStyle as ShoesStyleId)),
    top: layer('top', `${topStyle}:${topColor}:${bodyType}`, lookup(TOP_STYLES, topStyle, DEFAULT_AVATAR_APPEARANCE.topStyle as TopStyleId)),
    hair: hair.front ? layer('hair', `${hairStyle}:${hairColor}`, hair.front) : null,
    accessory:
      accessory !== null && Object.prototype.hasOwnProperty.call(ACCESSORY_STYLES, accessory)
        ? layer('accessory', `${accessory}:${bodyType}`, ACCESSORY_STYLES[accessory as AccessoryId])
        : null,
  };
  return AVATAR_LAYER_ORDER.map((slot) => layers[slot]);
}
