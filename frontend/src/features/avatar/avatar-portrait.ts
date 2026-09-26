import { avatarAppearanceKey, type AvatarAppearance } from '@virtual-office/shared';

import { drawAvatarFrame } from '@/game/avatars';

/** Head-and-shoulders crop of the front idle frame, in frame px. */
const CROP = { x: 3, y: -1, size: 26 };
const PORTRAIT_PX = 96;
const MAX_CACHED = 64;

const cache = new Map<string, string>();

/**
 * A small image of someone's avatar for UI badges, drawn with the same
 * painters as the office (so the team list matches the in-world look).
 * Rendered once per distinct look and cached as a data URL.
 */
export function avatarPortraitUrl(appearance: AvatarAppearance): string {
  const key = avatarAppearanceKey(appearance);
  const cached = cache.get(key);
  if (cached) return cached;

  const canvas = document.createElement('canvas');
  canvas.width = PORTRAIT_PX;
  canvas.height = PORTRAIT_PX;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';
  const scale = PORTRAIT_PX / CROP.size;
  drawAvatarFrame(ctx, appearance, 'down', 'idle', false, { x: -CROP.x * scale, y: -CROP.y * scale, scale });
  const url = canvas.toDataURL('image/png');

  if (cache.size >= MAX_CACHED) cache.delete(cache.keys().next().value as string);
  cache.set(key, url);
  return url;
}
