/**
 * Avatar look shared by the Phaser character renderer and the Vue avatar
 * badge, so an employee's in-world shirt color matches their UI avatar.
 * Framework-free on purpose: the game layer imports this too.
 */
export type HairStyle = 'SHORT' | 'LONG' | 'BUN' | 'CURLY' | 'BUZZ' | 'BOB' | 'WRAP';

export interface AvatarAppearance {
  skin: string;
  hair: string;
  hairStyle: HairStyle;
  shirt: string;
  pants: string;
}

const SKIN_TONES = ['#f6d2b8', '#eab993', '#d39a70', '#b97b52', '#8e5a3a', '#65402a'];
const HAIR_COLORS = ['#1c1714', '#3a2a20', '#5a3a22', '#8a5a2c', '#c9975a', '#9aa1ab'];
const HAIR_STYLES: HairStyle[] = ['SHORT', 'LONG', 'BUN', 'CURLY', 'BUZZ', 'BOB'];
const SHIRT_COLORS = ['#6366f1', '#0ea5e9', '#14b8a6', '#f97316', '#e11d48', '#8b5cf6', '#22c55e', '#f59e0b', '#64748b', '#ec4899'];
const PANTS_COLORS = ['#1e293b', '#334155', '#1e3a5f', '#3f3f46', '#44403c'];

export function hashString(value: string): number {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

function pick<T>(items: readonly T[], seed: number): T {
  return items[seed % items.length] as T;
}

export function resolveAvatarAppearance(seed: string, override: Partial<AvatarAppearance> = {}): AvatarAppearance {
  const hash = hashString(seed);
  return {
    skin: pick(SKIN_TONES, hash),
    hair: pick(HAIR_COLORS, hash >>> 3),
    hairStyle: pick(HAIR_STYLES, hash >>> 6),
    shirt: pick(SHIRT_COLORS, hash >>> 9),
    pants: pick(PANTS_COLORS, hash >>> 12),
    ...override,
  };
}

/** Stable cache key — identical looks share one generated texture. */
export function appearanceKey(appearance: AvatarAppearance): string {
  return [appearance.skin, appearance.hair, appearance.hairStyle, appearance.shirt, appearance.pants]
    .join('_')
    .replace(/#/g, '');
}

export function initialsOf(displayName: string): string {
  const parts = displayName.trim().split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] ?? '';
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? '') : '';
  return `${first}${last}`.toUpperCase();
}

export function firstNameOf(displayName: string): string {
  return displayName.trim().split(/\s+/)[0] ?? displayName;
}
