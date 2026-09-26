import type { AvatarAppearance, AvatarProfile } from '../types/avatar.types.js';

export interface AvatarOption {
  readonly id: string;
  readonly label: string;
}

export interface AvatarColorOption extends AvatarOption {
  readonly hex: string;
}

/**
 * Every cosmetic option that exists, as data. UIs list these, the frontend's
 * AvatarAssetRegistry maps each id to a drawing, and `normalizeAvatarAppearance`
 * validates against them (the backend uses the same check for realtime payloads).
 *
 * Adding an option = one entry here + one painter in the AvatarAssetRegistry;
 * the compiler reports a missing painter. Ids are persisted, so never rename
 * or reuse one — add a new id instead.
 */
export const AVATAR_CATALOG = {
  bodyType: [
    { id: 'body-regular', label: 'Regular' },
    { id: 'body-slim', label: 'Slim' },
    { id: 'body-broad', label: 'Broad' },
  ],
  skinTone: [
    { id: 'skin-01', label: 'Tone 1', hex: '#fbe3d0' },
    { id: 'skin-02', label: 'Tone 2', hex: '#f6d2b8' },
    { id: 'skin-03', label: 'Tone 3', hex: '#eab993' },
    { id: 'skin-04', label: 'Tone 4', hex: '#d39a70' },
    { id: 'skin-05', label: 'Tone 5', hex: '#b97b52' },
    { id: 'skin-06', label: 'Tone 6', hex: '#9a6440' },
    { id: 'skin-07', label: 'Tone 7', hex: '#7a4b30' },
    { id: 'skin-08', label: 'Tone 8', hex: '#5a3825' },
  ],
  hairStyle: [
    { id: 'hair-short', label: 'Short' },
    { id: 'hair-buzz', label: 'Buzz cut' },
    { id: 'hair-curly', label: 'Curly' },
    { id: 'hair-long', label: 'Long' },
    { id: 'hair-bob', label: 'Bob' },
    { id: 'hair-bun', label: 'Bun' },
    { id: 'hair-ponytail', label: 'Ponytail' },
    { id: 'hair-wrap', label: 'Head wrap' },
    { id: 'hair-shaved', label: 'Shaved' },
  ],
  hairColor: [
    { id: 'black', label: 'Black', hex: '#1c1714' },
    { id: 'espresso', label: 'Espresso', hex: '#3a2a20' },
    { id: 'brown', label: 'Brown', hex: '#5a3a22' },
    { id: 'auburn', label: 'Auburn', hex: '#7c3b24' },
    { id: 'copper', label: 'Copper', hex: '#b8653a' },
    { id: 'blonde', label: 'Blonde', hex: '#d4a55f' },
    { id: 'silver', label: 'Silver', hex: '#a3a9b3' },
    { id: 'navy', label: 'Navy', hex: '#1e3a5f' },
    { id: 'plum', label: 'Plum', hex: '#6b3a78' },
    { id: 'rose', label: 'Rose', hex: '#c0607a' },
  ],
  topStyle: [
    { id: 'top-tshirt', label: 'T-shirt' },
    { id: 'top-polo', label: 'Polo' },
    { id: 'top-shirt', label: 'Button shirt' },
    { id: 'top-sweater', label: 'Sweater' },
    { id: 'top-hoodie', label: 'Hoodie' },
    { id: 'top-blazer', label: 'Blazer' },
  ],
  topColor: [
    { id: 'indigo', label: 'Indigo', hex: '#6366f1' },
    { id: 'sky', label: 'Sky', hex: '#0ea5e9' },
    { id: 'teal', label: 'Teal', hex: '#14b8a6' },
    { id: 'green', label: 'Green', hex: '#22c55e' },
    { id: 'amber', label: 'Amber', hex: '#f59e0b' },
    { id: 'orange', label: 'Orange', hex: '#f97316' },
    { id: 'red', label: 'Red', hex: '#e11d48' },
    { id: 'pink', label: 'Pink', hex: '#ec4899' },
    { id: 'violet', label: 'Violet', hex: '#8b5cf6' },
    { id: 'slate', label: 'Slate', hex: '#64748b' },
    { id: 'charcoal', label: 'Charcoal', hex: '#374151' },
    { id: 'white', label: 'White', hex: '#e8eaef' },
  ],
  bottomStyle: [
    { id: 'bottom-pants', label: 'Trousers' },
    { id: 'bottom-jeans', label: 'Jeans' },
    { id: 'bottom-joggers', label: 'Joggers' },
    { id: 'bottom-shorts', label: 'Shorts' },
    { id: 'bottom-skirt', label: 'Skirt' },
  ],
  bottomColor: [
    { id: 'charcoal', label: 'Charcoal', hex: '#1f2937' },
    { id: 'slate', label: 'Slate', hex: '#475569' },
    { id: 'navy', label: 'Navy', hex: '#1e3a5f' },
    { id: 'denim', label: 'Denim', hex: '#3d5f8f' },
    { id: 'black', label: 'Black', hex: '#18181b' },
    { id: 'khaki', label: 'Khaki', hex: '#b09a74' },
    { id: 'olive', label: 'Olive', hex: '#56603f' },
    { id: 'brown', label: 'Brown', hex: '#6b4f3a' },
    { id: 'stone', label: 'Stone', hex: '#a8a29e' },
  ],
  shoesStyle: [
    { id: 'shoes-classic', label: 'Classic' },
    { id: 'shoes-sneakers', label: 'Sneakers' },
    { id: 'shoes-boots', label: 'Boots' },
    { id: 'shoes-canvas', label: 'Canvas' },
  ],
  accessory: [
    { id: 'acc-glasses-round', label: 'Round glasses' },
    { id: 'acc-glasses-square', label: 'Square glasses' },
    { id: 'acc-sunglasses', label: 'Sunglasses' },
    { id: 'acc-headphones', label: 'Headphones' },
    { id: 'acc-lanyard', label: 'Lanyard' },
  ],
} as const satisfies {
  readonly [Slot in keyof AvatarAppearance]: readonly (Slot extends AvatarColorSlot ? AvatarColorOption : AvatarOption)[];
};

export type AvatarCatalog = typeof AVATAR_CATALOG;
export type AvatarSlot = keyof AvatarCatalog;
export type AvatarOptionId<Slot extends AvatarSlot> = AvatarCatalog[Slot][number]['id'];

export type AvatarColorSlot = 'skinTone' | 'hairColor' | 'topColor' | 'bottomColor';
export type AvatarStyleSlot = Exclude<AvatarSlot, AvatarColorSlot>;
export const AVATAR_COLOR_SLOTS: readonly AvatarColorSlot[] = ['skinTone', 'hairColor', 'topColor', 'bottomColor'];

export function isAvatarColorSlot(slot: AvatarSlot): slot is AvatarColorSlot {
  return (AVATAR_COLOR_SLOTS as readonly string[]).includes(slot);
}

export type BodyTypeId = AvatarOptionId<'bodyType'>;
export type HairStyleId = AvatarOptionId<'hairStyle'>;
export type TopStyleId = AvatarOptionId<'topStyle'>;
export type BottomStyleId = AvatarOptionId<'bottomStyle'>;
export type ShoesStyleId = AvatarOptionId<'shoesStyle'>;
export type AccessoryId = AvatarOptionId<'accessory'>;

export const AVATAR_SLOTS = Object.keys(AVATAR_CATALOG) as AvatarSlot[];

/** Used whenever a stored value is missing or no longer exists in the catalog. */
export const DEFAULT_AVATAR_APPEARANCE: Readonly<AvatarAppearance> = Object.freeze({
  bodyType: 'body-regular',
  skinTone: 'skin-03',
  hairStyle: 'hair-short',
  hairColor: 'brown',
  topStyle: 'top-tshirt',
  topColor: 'indigo',
  bottomStyle: 'bottom-pants',
  bottomColor: 'charcoal',
  shoesStyle: 'shoes-classic',
  accessory: null,
});

/** Share of randomized avatars that get an accessory. */
const RANDOM_ACCESSORY_CHANCE = 0.45;

export function findAvatarOption(slot: AvatarSlot, id: unknown): AvatarOption | undefined {
  const options: readonly AvatarOption[] = AVATAR_CATALOG[slot];
  return typeof id === 'string' ? options.find((option) => option.id === id) : undefined;
}

/** Hex for a color option; falls back to the default option's color, so callers always get a paintable value. */
export function avatarColorHex(slot: AvatarColorSlot, id: string): string {
  const options: readonly AvatarColorOption[] = AVATAR_CATALOG[slot];
  const fallback = DEFAULT_AVATAR_APPEARANCE[slot];
  return (options.find((option) => option.id === id) ?? options.find((option) => option.id === fallback) ?? options[0])?.hex ?? '#888888';
}

/**
 * Turns anything (a stored profile, a socket payload, a partial draft) into
 * a fully valid appearance. Unknown or missing values fall back per field,
 * so one bad cosmetic setting can never make a character unrenderable.
 */
export function normalizeAvatarAppearance(input: unknown): AvatarAppearance {
  const source = (typeof input === 'object' && input !== null ? input : {}) as Partial<Record<AvatarSlot, unknown>>;
  const pick = (slot: Exclude<AvatarSlot, 'accessory'>): string => findAvatarOption(slot, source[slot])?.id ?? DEFAULT_AVATAR_APPEARANCE[slot];
  return {
    bodyType: pick('bodyType'),
    skinTone: pick('skinTone'),
    hairStyle: pick('hairStyle'),
    hairColor: pick('hairColor'),
    topStyle: pick('topStyle'),
    topColor: pick('topColor'),
    bottomStyle: pick('bottomStyle'),
    bottomColor: pick('bottomColor'),
    shoesStyle: pick('shoesStyle'),
    accessory: findAvatarOption('accessory', source.accessory)?.id ?? null,
  };
}

/**
 * Validates an untrusted profile (network, storage) for `employeeId`: the
 * owner is always forced to `employeeId`, cosmetics are normalized, and a
 * missing id/timestamp is filled in.
 */
export function normalizeAvatarProfile(input: unknown, employeeId: string, now: string = new Date().toISOString()): AvatarProfile {
  const source = (typeof input === 'object' && input !== null ? input : {}) as Partial<Record<'id' | 'updatedAt', unknown>>;
  const id = typeof source.id === 'string' && source.id.length > 0 && source.id.length <= 64 ? source.id : `avatar-${employeeId}`;
  const updatedAt = typeof source.updatedAt === 'string' && !Number.isNaN(Date.parse(source.updatedAt)) ? source.updatedAt : now;
  return { ...normalizeAvatarAppearance(input), id, employeeId, updatedAt };
}

/** A random look built only from catalog values. `random` is injectable for deterministic tests/demos. */
export function randomAvatarAppearance(random: () => number = Math.random): AvatarAppearance {
  const choose = <Slot extends AvatarSlot>(slot: Slot): string => {
    const options: readonly AvatarOption[] = AVATAR_CATALOG[slot];
    return options[Math.min(options.length - 1, Math.floor(random() * options.length))]?.id ?? '';
  };
  return normalizeAvatarAppearance({
    bodyType: choose('bodyType'),
    skinTone: choose('skinTone'),
    hairStyle: choose('hairStyle'),
    hairColor: choose('hairColor'),
    topStyle: choose('topStyle'),
    topColor: choose('topColor'),
    bottomStyle: choose('bottomStyle'),
    bottomColor: choose('bottomColor'),
    shoesStyle: choose('shoesStyle'),
    accessory: random() < RANDOM_ACCESSORY_CHANCE ? choose('accessory') : null,
  });
}

/** Stable identity of a look: equal keys render identically. */
export function avatarAppearanceKey(appearance: AvatarAppearance): string {
  return AVATAR_SLOTS.map((slot) => appearance[slot] ?? 'none').join('|');
}

export function sameAvatarAppearance(a: AvatarAppearance, b: AvatarAppearance): boolean {
  return avatarAppearanceKey(a) === avatarAppearanceKey(b);
}
