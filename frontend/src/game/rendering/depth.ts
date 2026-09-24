/**
 * Depth bands. Furniture and avatars in between are Y-sorted: their depth is
 * their footprint's bottom edge in world px (seats use their top edge so the
 * person sitting on them draws on top).
 */
export const DEPTH = {
  EXTERIOR: -30_000,
  BUILDING_SHADOW: -25_000,
  FLOOR: -20_000,
  RUG: -19_000,
  FLOOR_TEXT: -18_500,
  ROOM_HIGHLIGHT: -18_000,
  WALL: -15_000,
  AVATAR_RING: -14_000,
  ROOM_LABEL: 90_000,
  ROOM_SIGN: 91_000,
  AVATAR_LABEL: 100_000,
  TOOLTIP: 110_000,
} as const;
