import type Phaser from 'phaser';

import type { FurnitureKind } from '@/game/maps/office-map.types';

import { circle, createCanvasTexture, ellipse, fillRoundRect, shade, tint, withShadow, type Ctx } from './canvas-texture';
import { renderScaleOf } from './render-scale';

/** Transparent margin around every furniture texture so drop shadows are not clipped. */
export const FURNITURE_PADDING = 5;

export interface FurnitureSpec {
  width: number;
  height: number;
  /** Blocks the local player (physics) and NPC paths. */
  blocking: boolean;
  /** Seats draw beneath whoever sits on them (depth = top edge instead of bottom edge). */
  seat: boolean;
  defaultVariant: string;
  draw: (ctx: Ctx, variant: string, scale: number) => void;
}

const WOOD = '#e2cda9';
const WOOD_EDGE = '#c6ad85';
const WOOD_DARK = '#8f6b4c';
const WHITE = '#f6f6f3';
const WHITE_EDGE = '#d9dbe0';
const SCREEN = '#131925';
const GLOW = '#7cc4fa';
const LEAVES = ['#3f9d57', '#5cb872', '#2f7d47'];
const POT = '#efebe4';
const POT_EDGE = '#cfc7bb';
const STONE = '#eceef0';
const STONE_EDGE = '#c8ccd3';

export const FABRIC: Record<string, string> = {
  INDIGO: '#5b63d6',
  TEAL: '#2a9d8f',
  AMBER: '#dd9a3a',
  SLATE: '#667085',
  LAVENDER: '#9d8fd4',
  CORAL: '#ef6f5e',
  YELLOW: '#e9b949',
  VIOLET: '#8f6bd9',
  PINK: '#e25597',
  CYAN: '#21b3cc',
  CHARCOAL: '#4a5263',
};

const fabric = (variant: string) => FABRIC[variant] ?? FABRIC.CHARCOAL ?? '#4a5263';

function screenGradient(ctx: Ctx, x: number, y: number, width: number): CanvasGradient {
  const gradient = ctx.createLinearGradient(x, y, x + width, y);
  gradient.addColorStop(0, '#7cc4fa');
  gradient.addColorStop(1, '#8b90ff');
  return gradient;
}

function drawPlant(ctx: Ctx, size: number, leafCount: number, scale: number): void {
  const c = size / 2;
  withShadow(ctx, scale, () => circle(ctx, c, c, size * 0.31, POT_EDGE));
  circle(ctx, c, c, size * 0.26, POT);
  for (let index = 0; index < leafCount; index += 1) {
    const angle = (index / leafCount) * Math.PI * 2 + 0.3;
    const reach = size * 0.23;
    ellipse(ctx, c + Math.cos(angle) * reach, c + Math.sin(angle) * reach, size * 0.25, size * 0.12, LEAVES[index % 3] ?? '#3f9d57', angle);
  }
  circle(ctx, c, c, size * 0.14, LEAVES[2] ?? '#2f7d47');
  ellipse(ctx, c - size * 0.12, c - size * 0.16, size * 0.1, size * 0.05, 'rgba(255,255,255,0.22)', -0.6);
}

export const FURNITURE_CATALOG: Record<FurnitureKind, FurnitureSpec> = {
  CHAIR: {
    width: 20,
    height: 20,
    blocking: false,
    seat: true,
    defaultVariant: 'CHARCOAL',
    draw(ctx, variant, scale) {
      const color = fabric(variant);
      withShadow(ctx, scale, () => fillRoundRect(ctx, 1, 3, 18, 16, 5.5, color));
      fillRoundRect(ctx, 2, 0, 16, 6.5, 3.2, shade(color, 0.78));
      fillRoundRect(ctx, 4.5, 8.5, 11, 8, 3.5, tint(color, 0.14));
    },
  },
  STOOL: {
    width: 16,
    height: 16,
    blocking: false,
    seat: true,
    defaultVariant: 'default',
    draw(ctx, _variant, scale) {
      withShadow(ctx, scale, () => circle(ctx, 8, 8, 7.6, WOOD_EDGE));
      circle(ctx, 8, 8, 6, WOOD);
      circle(ctx, 6.4, 6.2, 1.8, 'rgba(255,255,255,0.25)');
    },
  },
  ARMCHAIR: {
    width: 34,
    height: 32,
    blocking: true,
    seat: true,
    defaultVariant: 'INDIGO',
    draw(ctx, variant, scale) {
      const color = fabric(variant);
      withShadow(ctx, scale, () => fillRoundRect(ctx, 0, 0, 34, 32, 8, shade(color, 0.84)));
      fillRoundRect(ctx, 2, 1, 30, 9.5, 5, shade(color, 0.72));
      fillRoundRect(ctx, 0.5, 4, 7, 27, 4, shade(color, 0.78));
      fillRoundRect(ctx, 26.5, 4, 7, 27, 4, shade(color, 0.78));
      fillRoundRect(ctx, 7.5, 9.5, 19, 19.5, 5, color);
      fillRoundRect(ctx, 10, 12, 10, 4, 2, 'rgba(255,255,255,0.14)');
    },
  },
  SOFA: {
    width: 96,
    height: 38,
    blocking: true,
    seat: true,
    defaultVariant: 'SLATE',
    draw(ctx, variant, scale) {
      const color = fabric(variant);
      withShadow(ctx, scale, () => fillRoundRect(ctx, 0, 0, 96, 38, 9, shade(color, 0.82)));
      fillRoundRect(ctx, 3, 1, 90, 11.5, 6, shade(color, 0.7));
      fillRoundRect(ctx, 0.5, 4, 10, 33, 5, shade(color, 0.76));
      fillRoundRect(ctx, 85.5, 4, 10, 33, 5, shade(color, 0.76));
      for (let index = 0; index < 3; index += 1) {
        const x = 11 + index * 24.8;
        fillRoundRect(ctx, x, 11.5, 23.6, 23.5, 5, color);
        fillRoundRect(ctx, x + 3, 14, 12, 4, 2, 'rgba(255,255,255,0.13)');
      }
    },
  },
  BEANBAG: {
    width: 32,
    height: 30,
    blocking: false,
    seat: true,
    defaultVariant: 'CORAL',
    draw(ctx, variant, scale) {
      const color = fabric(variant);
      withShadow(ctx, scale, () => ellipse(ctx, 16, 15.5, 15.5, 14, shade(color, 0.82)));
      ellipse(ctx, 16, 13.5, 12, 10, color);
      ellipse(ctx, 12, 9.5, 5, 2.8, 'rgba(255,255,255,0.2)', -0.5);
    },
  },
  COFFEE_TABLE: {
    width: 60,
    height: 32,
    blocking: true,
    seat: false,
    defaultVariant: 'default',
    draw(ctx, _variant, scale) {
      withShadow(ctx, scale, () => fillRoundRect(ctx, 0, 0, 60, 32, 7, WOOD_EDGE));
      fillRoundRect(ctx, 2, 2, 56, 28, 6, WOOD);
      circle(ctx, 45, 16, 5.5, LEAVES[1] ?? '#5cb872');
      circle(ctx, 45, 16, 2.2, LEAVES[2] ?? '#2f7d47');
      fillRoundRect(ctx, 14, 12, 14, 9, 1.5, '#5b63d6');
      fillRoundRect(ctx, 15.5, 13.2, 11, 6.6, 1, '#7c83ff');
      circle(ctx, 33, 10, 2.8, '#fafafa');
    },
  },
  MEETING_TABLE_ROUND: {
    width: 84,
    height: 84,
    blocking: true,
    seat: false,
    defaultVariant: 'default',
    draw(ctx, _variant, scale) {
      withShadow(ctx, scale, () => circle(ctx, 42, 42, 42, WOOD_EDGE), 4, 2);
      circle(ctx, 42, 42, 39.5, WOOD);
      circle(ctx, 42, 42, 7, '#2d3342');
      circle(ctx, 42, 42, 3.5, '#4b5563');
      fillRoundRect(ctx, 34, 14, 16, 11, 1.5, WHITE);
      fillRoundRect(ctx, 16, 36, 11, 12, 1.5, WHITE);
      fillRoundRect(ctx, 58, 37, 10, 12, 1.5, '#1f2430');
    },
  },
  MEETING_TABLE_LONG: {
    width: 208,
    height: 72,
    blocking: true,
    seat: false,
    defaultVariant: 'default',
    draw(ctx, _variant, scale) {
      withShadow(ctx, scale, () => fillRoundRect(ctx, 0, 0, 208, 72, 14, WOOD_EDGE), 4, 2);
      fillRoundRect(ctx, 2.5, 2.5, 203, 67, 12, WOOD);
      fillRoundRect(ctx, 40, 33, 128, 6, 3, shade(WOOD, 0.92));
      circle(ctx, 70, 36, 5, '#2d3342');
      circle(ctx, 138, 36, 5, '#2d3342');
      for (const x of [55, 99, 143]) {
        fillRoundRect(ctx, x, 9, 18, 12, 1.5, WHITE);
        fillRoundRect(ctx, x, 51, 18, 12, 1.5, x === 99 ? '#1f2430' : WHITE);
      }
    },
  },
  REVIEW_TABLE: {
    width: 176,
    height: 72,
    blocking: true,
    seat: false,
    defaultVariant: 'default',
    draw(ctx, _variant, scale) {
      withShadow(ctx, scale, () => fillRoundRect(ctx, 0, 0, 176, 72, 10, WHITE_EDGE), 4, 2);
      fillRoundRect(ctx, 2, 2, 172, 68, 9, WHITE);
      for (const cx of [34, 88, 142]) {
        fillRoundRect(ctx, cx - 16, 24, 32, 8, 2.5, SCREEN);
        ctx.fillStyle = screenGradient(ctx, cx - 14, 25, 28);
        ctx.beginPath();
        ctx.roundRect(cx - 14.5, 25.2, 29, 5.6, 1.8);
        ctx.fill();
        fillRoundRect(ctx, cx - 16, 40, 32, 8, 2.5, SCREEN);
        fillRoundRect(ctx, cx - 14.5, 41.2, 29, 5.6, 1.8, '#2c3444');
        fillRoundRect(ctx, cx - 10, 10, 20, 6, 1.5, '#dfe2e8');
        fillRoundRect(ctx, cx - 10, 56, 20, 6, 1.5, '#dfe2e8');
      }
    },
  },
  DINING_TABLE: {
    width: 100,
    height: 52,
    blocking: true,
    seat: false,
    defaultVariant: 'default',
    draw(ctx, _variant, scale) {
      withShadow(ctx, scale, () => fillRoundRect(ctx, 0, 0, 100, 52, 10, WOOD_EDGE), 4, 2);
      fillRoundRect(ctx, 2, 2, 96, 48, 9, WOOD);
      circle(ctx, 50, 26, 9, '#f5f5f4');
      circle(ctx, 47, 24, 3, '#ef4444');
      circle(ctx, 53, 25, 3, '#f59e0b');
      circle(ctx, 50, 29, 3, '#84cc16');
      circle(ctx, 20, 18, 3, '#fafafa');
      circle(ctx, 80, 34, 3, '#fafafa');
    },
  },
  TV_SCREEN: {
    width: 96,
    height: 10,
    blocking: false,
    seat: false,
    defaultVariant: 'default',
    draw(ctx, _variant, scale) {
      withShadow(ctx, scale, () => fillRoundRect(ctx, 0, 0, 96, 10, 3, '#10141d'), 2, 1);
      ctx.fillStyle = screenGradient(ctx, 3, 6, 90);
      ctx.beginPath();
      ctx.roundRect(3, 5.5, 90, 2.6, 1.2);
      ctx.fill();
    },
  },
  BIG_SCREEN: {
    width: 160,
    height: 12,
    blocking: false,
    seat: false,
    defaultVariant: 'default',
    draw(ctx, _variant, scale) {
      withShadow(ctx, scale, () => fillRoundRect(ctx, 0, 0, 160, 12, 3, '#10141d'), 2, 1);
      ctx.fillStyle = screenGradient(ctx, 4, 7, 152);
      ctx.beginPath();
      ctx.roundRect(4, 6.5, 152, 3, 1.4);
      ctx.fill();
    },
  },
  WHITEBOARD: {
    width: 96,
    height: 10,
    blocking: false,
    seat: false,
    defaultVariant: 'default',
    draw(ctx, _variant, scale) {
      withShadow(ctx, scale, () => fillRoundRect(ctx, 0, 0, 96, 10, 2, '#b9bfca'), 2, 1);
      fillRoundRect(ctx, 1.5, 1.5, 93, 7, 1.5, '#fdfdfd');
      for (const [x, color] of [[14, '#ef4444'], [30, '#3b82f6'], [52, '#22c55e'], [70, '#3b82f6']] as const) {
        fillRoundRect(ctx, x, 3.6, 12, 1.4, 0.7, color);
      }
    },
  },
  WHITEBOARD_STAND: {
    width: 80,
    height: 14,
    blocking: true,
    seat: false,
    defaultVariant: 'default',
    draw(ctx, _variant, scale) {
      fillRoundRect(ctx, 0, 4, 6, 7, 2, '#4b5563');
      fillRoundRect(ctx, 74, 4, 6, 7, 2, '#4b5563');
      withShadow(ctx, scale, () => fillRoundRect(ctx, 3, 1.5, 74, 11, 2, '#c3c8d2'), 2.5, 1.2);
      fillRoundRect(ctx, 4.5, 3, 71, 8, 1.5, '#fdfdfd');
      ['#fde047', '#f9a8d4', '#93c5fd', '#86efac', '#fde047', '#c4b5fd'].forEach((color, index) => {
        fillRoundRect(ctx, 9 + index * 11, 4.2, 7, 5.6, 0.8, color);
      });
    },
  },
  MOODBOARD: {
    width: 110,
    height: 12,
    blocking: false,
    seat: false,
    defaultVariant: 'default',
    draw(ctx, _variant, scale) {
      withShadow(ctx, scale, () => fillRoundRect(ctx, 0, 0, 110, 12, 2.5, '#a9825e'), 2, 1);
      fillRoundRect(ctx, 1.5, 1.5, 107, 9, 2, '#c9a27b');
      ['#f472b6', '#60a5fa', '#fbbf24', '#34d399', '#a78bfa', '#fb7185', '#38bdf8'].forEach((color, index) => {
        fillRoundRect(ctx, 6 + index * 14.5, 2.8 + (index % 2) * 0.8, 10, 5.6, 0.8, color);
      });
    },
  },
  BOOKSHELF: {
    width: 80,
    height: 22,
    blocking: true,
    seat: false,
    defaultVariant: 'default',
    draw(ctx, _variant, scale) {
      withShadow(ctx, scale, () => fillRoundRect(ctx, 0, 0, 80, 22, 3, WOOD_DARK));
      fillRoundRect(ctx, 2, 2, 76, 18, 2, shade(WOOD_DARK, 0.78));
      const colors = ['#5b63d6', '#ef6f5e', '#e9b949', '#2a9d8f', '#f6f6f3', '#8f6bd9', '#21b3cc', '#e25597'];
      let x = 4;
      let index = 0;
      while (x < 74) {
        const width = 3 + ((index * 7) % 4);
        fillRoundRect(ctx, x, 4 + (index % 3), width, 14 - (index % 3), 0.8, colors[index % colors.length] ?? '#5b63d6');
        x += width + 0.8;
        index += 1;
      }
    },
  },
  PLANT_LARGE: {
    width: 36,
    height: 36,
    blocking: true,
    seat: false,
    defaultVariant: 'default',
    draw(ctx, _variant, scale) {
      drawPlant(ctx, 36, 8, scale);
    },
  },
  PLANT_SMALL: {
    width: 24,
    height: 24,
    blocking: true,
    seat: false,
    defaultVariant: 'default',
    draw(ctx, _variant, scale) {
      drawPlant(ctx, 24, 6, scale);
    },
  },
  PLANTER_LONG: {
    width: 96,
    height: 22,
    blocking: true,
    seat: false,
    defaultVariant: 'default',
    draw(ctx, _variant, scale) {
      withShadow(ctx, scale, () => fillRoundRect(ctx, 0, 3, 96, 17, 4, WOOD_DARK));
      fillRoundRect(ctx, 2, 5, 92, 13, 3, shade(WOOD_DARK, 0.7));
      for (let x = 7; x < 92; x += 9.5) {
        const index = Math.round(x);
        circle(ctx, x, 11.5 + ((index % 3) - 1) * 1.2, 6.6, LEAVES[index % 3] ?? '#3f9d57');
      }
      for (let x = 12; x < 90; x += 19) circle(ctx, x, 9, 1.6, '#fef3c7');
    },
  },
  FLOOR_LAMP: {
    width: 18,
    height: 18,
    blocking: true,
    seat: false,
    defaultVariant: 'default',
    draw(ctx, _variant, scale) {
      const glow = ctx.createRadialGradient(9, 9, 2, 9, 9, 9);
      glow.addColorStop(0, 'rgba(253, 230, 138, 0.9)');
      glow.addColorStop(1, 'rgba(253, 230, 138, 0)');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(9, 9, 9, 0, Math.PI * 2);
      ctx.fill();
      withShadow(ctx, scale, () => circle(ctx, 9, 9, 6, '#fde68a'));
      circle(ctx, 9, 9, 2, '#fffbeb');
    },
  },
  KITCHEN_COUNTER: {
    width: 128,
    height: 30,
    blocking: true,
    seat: false,
    defaultVariant: 'PLAIN',
    draw(ctx, variant, scale) {
      withShadow(ctx, scale, () => fillRoundRect(ctx, 0, 0, 128, 30, 4, STONE_EDGE));
      fillRoundRect(ctx, 1.5, 1.5, 125, 27, 3, STONE);
      if (variant === 'SINK') {
        fillRoundRect(ctx, 46, 6, 36, 18, 5, '#c7ccd4');
        fillRoundRect(ctx, 48.5, 8.5, 31, 13, 4, '#aeb5bf');
        circle(ctx, 64, 5, 2.5, '#8b93a1');
        circle(ctx, 18, 15, 5, '#f8fafc');
        circle(ctx, 104, 12, 4, LEAVES[0] ?? '#3f9d57');
      } else if (variant === 'COFFEE') {
        fillRoundRect(ctx, 16, 4, 28, 21, 4, '#2b303b');
        circle(ctx, 30, 14, 5, '#1b1f27');
        circle(ctx, 39, 8, 1.3, '#22c55e');
        for (const x of [58, 67, 76]) circle(ctx, x, 16, 3.2, '#ffffff');
        circle(ctx, 104, 15, 6.5, '#9aa3b2');
        circle(ctx, 104, 15, 4, '#b8c0cc');
      }
    },
  },
  FRIDGE: {
    width: 34,
    height: 32,
    blocking: true,
    seat: false,
    defaultVariant: 'default',
    draw(ctx, _variant, scale) {
      withShadow(ctx, scale, () => fillRoundRect(ctx, 0, 0, 34, 32, 5, '#d9dfe6'));
      fillRoundRect(ctx, 2, 2, 30, 28, 4, '#f3f6f9');
      fillRoundRect(ctx, 6, 8, 2.2, 16, 1.1, '#aab2bd');
      fillRoundRect(ctx, 12, 6, 6, 4, 1, '#fca5a5');
      fillRoundRect(ctx, 20, 12, 5, 5, 1, '#93c5fd');
    },
  },
  WATER_COOLER: {
    width: 20,
    height: 20,
    blocking: true,
    seat: false,
    defaultVariant: 'default',
    draw(ctx, _variant, scale) {
      withShadow(ctx, scale, () => circle(ctx, 10, 10, 9, '#e3e8ee'));
      circle(ctx, 10, 10, 6, '#7cc0ec');
      circle(ctx, 8, 8, 2, 'rgba(255,255,255,0.55)');
    },
  },
  PING_PONG: {
    width: 136,
    height: 76,
    blocking: true,
    seat: false,
    defaultVariant: 'default',
    draw(ctx, _variant, scale) {
      withShadow(ctx, scale, () => fillRoundRect(ctx, 0, 0, 136, 76, 5, '#174f63'), 4, 2);
      fillRoundRect(ctx, 3, 3, 130, 70, 4, '#1f6f8b');
      ctx.strokeStyle = 'rgba(255,255,255,0.85)';
      ctx.lineWidth = 1.3;
      ctx.strokeRect(6, 6, 124, 64);
      ctx.beginPath();
      ctx.moveTo(6, 38);
      ctx.lineTo(130, 38);
      ctx.lineWidth = 0.8;
      ctx.stroke();
      fillRoundRect(ctx, 66.8, 0, 2.6, 76, 1, '#e5e7eb');
      circle(ctx, 40, 24, 2, '#fb923c');
      fillRoundRect(ctx, 14, 30, 7, 10, 3, '#ef4444');
      fillRoundRect(ctx, 115, 36, 7, 10, 3, '#111827');
    },
  },
  FOOSBALL: {
    width: 84,
    height: 46,
    blocking: true,
    seat: false,
    defaultVariant: 'default',
    draw(ctx, _variant, scale) {
      withShadow(ctx, scale, () => fillRoundRect(ctx, 0, 0, 84, 46, 5, WOOD_DARK), 4, 2);
      fillRoundRect(ctx, 6, 5, 72, 36, 3, '#3a9a57');
      ctx.fillStyle = 'rgba(255,255,255,0.7)';
      ctx.fillRect(41.6, 5, 0.9, 36);
      for (let index = 0; index < 8; index += 1) {
        const x = 11 + index * 8.9;
        ctx.fillStyle = '#cbd5e1';
        ctx.fillRect(x - 0.5, 0, 1, 46);
        const color = index % 2 === 0 ? '#ef4444' : '#3b82f6';
        for (const y of index % 3 === 0 ? [23] : [15, 31]) fillRoundRect(ctx, x - 2, y - 2.6, 4, 5.2, 1.2, color);
      }
    },
  },
  ARCADE: {
    width: 40,
    height: 34,
    blocking: true,
    seat: false,
    defaultVariant: 'PINK',
    draw(ctx, variant, scale) {
      const color = fabric(variant);
      withShadow(ctx, scale, () => fillRoundRect(ctx, 0, 0, 40, 34, 5, '#1f2433'));
      fillRoundRect(ctx, 3, 2, 34, 8, 3, color);
      fillRoundRect(ctx, 6, 12, 28, 12, 3, '#0b1020');
      fillRoundRect(ctx, 8, 14, 24, 8, 2, tint(color, 0.35));
      circle(ctx, 12, 29, 2.4, '#e5e7eb');
      circle(ctx, 24, 29, 2, '#facc15');
      circle(ctx, 30, 29, 2, '#22d3ee');
    },
  },
  RECEPTION_DESK: {
    width: 150,
    height: 46,
    blocking: true,
    seat: false,
    defaultVariant: 'default',
    draw(ctx, _variant, scale) {
      withShadow(ctx, scale, () => fillRoundRect(ctx, 0, 0, 150, 46, 18, '#e4e1db'), 4, 2);
      fillRoundRect(ctx, 4, 4, 142, 28, 13, '#f7f5f1');
      fillRoundRect(ctx, 6, 36, 138, 7, 3.5, '#7c83ff');
      fillRoundRect(ctx, 98, 8, 28, 8, 2.5, SCREEN);
      ctx.fillStyle = screenGradient(ctx, 100, 9, 24);
      ctx.beginPath();
      ctx.roundRect(99.5, 9.2, 25, 5.6, 1.6);
      ctx.fill();
      circle(ctx, 22, 18, 6, LEAVES[1] ?? '#5cb872');
      circle(ctx, 22, 18, 2.5, LEAVES[2] ?? '#2f7d47');
      circle(ctx, 60, 17, 3, '#fafafa');
    },
  },
  FOCUS_POD: {
    width: 70,
    height: 44,
    blocking: true,
    seat: false,
    defaultVariant: 'default',
    draw(ctx, _variant, scale) {
      withShadow(ctx, scale, () => fillRoundRect(ctx, 3, 5, 64, 34, 4, WHITE_EDGE));
      fillRoundRect(ctx, 4.5, 6.5, 61, 31, 3.5, WHITE);
      const panel = '#a8a3cb';
      fillRoundRect(ctx, 0, 0, 70, 7, 3, panel);
      fillRoundRect(ctx, 0, 0, 7, 40, 3, panel);
      fillRoundRect(ctx, 63, 0, 7, 40, 3, panel);
      fillRoundRect(ctx, 20, 9, 30, 7, 2.5, SCREEN);
      fillRoundRect(ctx, 21.5, 10.2, 27, 4.6, 1.6, '#2c3444');
      circle(ctx, 57, 17, 4, '#fde68a');
      fillRoundRect(ctx, 26, 25, 18, 5, 1.5, '#d5d9e0');
    },
  },
  DRAWING_TABLE: {
    width: 80,
    height: 52,
    blocking: true,
    seat: false,
    defaultVariant: 'default',
    draw(ctx, _variant, scale) {
      withShadow(ctx, scale, () => fillRoundRect(ctx, 0, 0, 80, 52, 6, WOOD_EDGE), 4, 2);
      fillRoundRect(ctx, 2, 2, 76, 48, 5, '#f1e6d4');
      ctx.save();
      ctx.translate(26, 20);
      ctx.rotate(-0.08);
      fillRoundRect(ctx, -14, -10, 28, 20, 1, '#ffffff');
      ctx.restore();
      ctx.save();
      ctx.translate(52, 26);
      ctx.rotate(0.1);
      fillRoundRect(ctx, -12, -9, 24, 18, 1, '#ffffff');
      fillRoundRect(ctx, -8, -5, 16, 3, 1, '#f9a8d4');
      fillRoundRect(ctx, -8, 0, 11, 3, 1, '#93c5fd');
      ctx.restore();
      ['#ef4444', '#f59e0b', '#22c55e', '#3b82f6', '#8b5cf6'].forEach((color, index) => circle(ctx, 14 + index * 7, 42, 2.4, color));
    },
  },
  DEVICE_RACK: {
    width: 70,
    height: 26,
    blocking: true,
    seat: false,
    defaultVariant: 'default',
    draw(ctx, _variant, scale) {
      withShadow(ctx, scale, () => fillRoundRect(ctx, 0, 0, 70, 26, 5, '#2b3040'));
      fillRoundRect(ctx, 2, 2, 66, 22, 4, '#343a4c');
      for (let index = 0; index < 4; index += 1) {
        const x = 5 + index * 11.5;
        fillRoundRect(ctx, x, 4.5, 9, 17, 2.5, '#0f1320');
        fillRoundRect(ctx, x + 1.2, 6, 6.6, 13.5, 1.5, index % 2 === 0 ? GLOW : '#a5b4fc');
      }
      fillRoundRect(ctx, 51, 4.5, 15, 17, 2.5, '#0f1320');
      fillRoundRect(ctx, 52.5, 6, 12, 13.5, 1.5, '#86efac');
    },
  },
  PRINTER: {
    width: 34,
    height: 28,
    blocking: true,
    seat: false,
    defaultVariant: 'default',
    draw(ctx, _variant, scale) {
      withShadow(ctx, scale, () => fillRoundRect(ctx, 0, 0, 34, 28, 4, '#dde1e6'));
      fillRoundRect(ctx, 3, 3, 28, 10, 2, '#c1c7cf');
      fillRoundRect(ctx, 7, 16, 20, 9, 1, '#ffffff');
      circle(ctx, 27, 8, 1.3, '#22c55e');
    },
  },
};

export function furnitureTextureKey(kind: FurnitureKind, variant: string | undefined): string {
  return `furniture-${kind.toLowerCase()}-${(variant ?? FURNITURE_CATALOG[kind].defaultVariant).toLowerCase()}`;
}

export function ensureFurnitureTexture(scene: Phaser.Scene, kind: FurnitureKind, variant?: string): string {
  const spec = FURNITURE_CATALOG[kind];
  const resolvedVariant = variant ?? spec.defaultVariant;
  const key = furnitureTextureKey(kind, resolvedVariant);
  const { textureScale } = renderScaleOf(scene);
  createCanvasTexture(
    scene,
    key,
    spec.width + FURNITURE_PADDING * 2,
    spec.height + FURNITURE_PADDING * 2,
    textureScale,
    (ctx) => {
      ctx.translate(FURNITURE_PADDING, FURNITURE_PADDING);
      spec.draw(ctx, resolvedVariant, textureScale);
    },
  );
  return key;
}

/* ---------------------------------------------------------------------- */
/* Desks                                                                   */
/* ---------------------------------------------------------------------- */

export const DESK_WIDTH = 60;
export const DESK_HEIGHT = 30;

export function deskTextureKey(screenOn: boolean): string {
  return screenOn ? 'desk-screen-on' : 'desk-screen-off';
}

export function ensureDeskTextures(scene: Phaser.Scene): void {
  const { textureScale } = renderScaleOf(scene);
  for (const screenOn of [true, false]) {
    createCanvasTexture(
      scene,
      deskTextureKey(screenOn),
      DESK_WIDTH + FURNITURE_PADDING * 2,
      DESK_HEIGHT + FURNITURE_PADDING * 2,
      textureScale,
      (ctx) => {
        ctx.translate(FURNITURE_PADDING, FURNITURE_PADDING);
        withShadow(ctx, textureScale, () => fillRoundRect(ctx, 0, 0, DESK_WIDTH, DESK_HEIGHT, 4, '#d8d0c2'));
        fillRoundRect(ctx, 1.5, 1.5, DESK_WIDTH - 3, DESK_HEIGHT - 3, 3, '#f4f1eb');
        fillRoundRect(ctx, 28, 8, 4, 3, 1, '#4b5263');
        fillRoundRect(ctx, 14, 1.5, 32, 7.5, 2.5, '#1b202c');
        if (screenOn) {
          ctx.fillStyle = screenGradient(ctx, 15.5, 3, 29);
          ctx.beginPath();
          ctx.roundRect(15.5, 2.8, 29, 4.9, 1.8);
          ctx.fill();
        } else {
          fillRoundRect(ctx, 15.5, 2.8, 29, 4.9, 1.8, '#2b3242');
        }
        fillRoundRect(ctx, 19, 16.5, 21, 6, 1.5, '#dfe2e8');
        ctx.fillStyle = 'rgba(100,110,130,0.35)';
        for (let x = 20.5; x < 39; x += 2.3) ctx.fillRect(x, 18, 1.2, 1);
        ellipse(ctx, 45, 19.5, 2.1, 2.9, '#dfe2e8');
        circle(ctx, 7.5, 9, 3, '#fafafa');
        circle(ctx, 7.5, 9, 1.7, '#8b5e3c');
        fillRoundRect(ctx, 49, 5, 8, 10, 1, '#ffffff');
      },
    );
  }
}
