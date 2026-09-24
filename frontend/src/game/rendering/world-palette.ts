import type { FloorStyle, WallStyle } from '@/game/maps/office-map.types';

/** Floor-plan palette: light, slightly warm floors on a dark exterior, dark walls for crisp room outlines. */
export const WORLD_COLORS = {
  exterior: 0x0c0f15,
  exteriorDot: 0x1d2330,
  buildingShadow: 0x000000,
  doorThreshold: 0xe7e3dc,
  floorText: '#8a93a6',
  labelBg: 0x151922,
  labelText: '#e6e8ee',
  labelMuted: '#9ba3b4',
  accent: 0x7c83ff,
  accentHex: '#7c83ff',
} as const;

export interface FloorPaint {
  base: number;
  line: number;
}

export const FLOOR_PAINT: Record<FloorStyle, FloorPaint> = {
  CORRIDOR: { base: 0xdcdfe5, line: 0xc8ccd4 },
  CARPET_BLUE: { base: 0xd3dcea, line: 0xc0cbdd },
  CARPET_ROSE: { base: 0xecdbe1, line: 0xdcc6ce },
  CARPET_MINT: { base: 0xd8e9df, line: 0xc3d9cc },
  CARPET_SAND: { base: 0xeee2cf, line: 0xdccdb6 },
  CARPET_LAVENDER: { base: 0xe0dbef, line: 0xcfc8e4 },
  WOOD_LIGHT: { base: 0xe9dcc6, line: 0xd8c7ab },
  WOOD_DARK: { base: 0xcdb495, line: 0xb89c7b },
  TILE_KITCHEN: { base: 0xe6e9ec, line: 0xd3d8dd },
  RUBBER_TEAL: { base: 0xcfe3e0, line: 0xb9d3cf },
  MARBLE: { base: 0xecebe7, line: 0xdad8d2 },
};

export interface WallPaint {
  thickness: number;
  fill: number;
  fillAlpha: number;
  highlight: number;
  highlightAlpha: number;
}

export const WALL_PAINT: Record<WallStyle, WallPaint> = {
  OUTER: { thickness: 14, fill: 0x262c3a, fillAlpha: 1, highlight: 0x4a5368, highlightAlpha: 1 },
  INNER: { thickness: 10, fill: 0x363d50, fillAlpha: 1, highlight: 0x566079, highlightAlpha: 1 },
  GLASS: { thickness: 8, fill: 0x9ec6ea, fillAlpha: 0.55, highlight: 0xffffff, highlightAlpha: 0.85 },
};
