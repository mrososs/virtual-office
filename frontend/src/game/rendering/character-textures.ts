import type { Direction } from '@virtual-office/shared';
import type Phaser from 'phaser';

import { registerCharacterAnimations } from '@/game/animations/character-animations';
import { appearanceKey, type AvatarAppearance } from '@/shared/utils/avatar-appearance';

import { createCanvasTexture, circle, ellipse, fillRoundRect, shade, type Ctx } from './canvas-texture';
import { renderScaleOf } from './render-scale';

export const CHARACTER_FRAME_WIDTH = 32;
export const CHARACTER_FRAME_HEIGHT = 42;
/** Feet baseline inside the frame, used as the sprite origin. */
export const CHARACTER_FEET_Y = 40;

const DIRECTIONS: readonly Direction[] = ['down', 'left', 'right', 'up'];
const POSES = ['idle', 'breathe', 'stepA', 'stepB'] as const;
type Pose = (typeof POSES)[number];

const CX = 16;
const HEAD_CY = 13.5;
const HEAD_R = 9;
const OUTLINE = 'rgba(17, 22, 33, 0.42)';
const SHOE = '#232833';

export function characterFrameName(direction: Direction, pose: Pose): string {
  return `${direction}-${pose}`;
}

/** Generates (once per look) the spritesheet + animations and returns the texture key. */
export function ensureCharacterTexture(scene: Phaser.Scene, appearance: AvatarAppearance): string {
  const key = `avatar-${appearanceKey(appearance)}`;
  if (scene.textures.exists(key)) return key;

  const { textureScale } = renderScaleOf(scene);
  const width = CHARACTER_FRAME_WIDTH * POSES.length;
  const height = CHARACTER_FRAME_HEIGHT * DIRECTIONS.length;

  const texture = createCanvasTexture(scene, key, width, height, textureScale, (ctx) => {
    DIRECTIONS.forEach((direction, row) => {
      POSES.forEach((pose, column) => {
        ctx.save();
        ctx.translate(column * CHARACTER_FRAME_WIDTH, row * CHARACTER_FRAME_HEIGHT);
        if (direction === 'right') {
          ctx.translate(CHARACTER_FRAME_WIDTH, 0);
          ctx.scale(-1, 1);
          drawCharacter(ctx, appearance, 'left', pose);
        } else {
          drawCharacter(ctx, appearance, direction, pose);
        }
        ctx.restore();
      });
    });
  });

  if (texture) {
    DIRECTIONS.forEach((direction, row) => {
      POSES.forEach((pose, column) => {
        texture.add(
          characterFrameName(direction, pose),
          0,
          column * CHARACTER_FRAME_WIDTH * textureScale,
          row * CHARACTER_FRAME_HEIGHT * textureScale,
          CHARACTER_FRAME_WIDTH * textureScale,
          CHARACTER_FRAME_HEIGHT * textureScale,
        );
      });
    });
    registerCharacterAnimations(scene.anims, key, DIRECTIONS, characterFrameName);
  }
  return key;
}

interface PoseOffsets {
  bodyDy: number;
  leftLift: number;
  rightLift: number;
  armSwing: number;
}

function poseOffsets(pose: Pose): PoseOffsets {
  switch (pose) {
    case 'breathe':
      return { bodyDy: -0.5, leftLift: 0, rightLift: 0, armSwing: 0 };
    case 'stepA':
      return { bodyDy: -0.8, leftLift: 1.6, rightLift: 0, armSwing: 1.2 };
    case 'stepB':
      return { bodyDy: -0.8, leftLift: 0, rightLift: 1.6, armSwing: -1.2 };
    default:
      return { bodyDy: 0, leftLift: 0, rightLift: 0, armSwing: 0 };
  }
}

/** `direction` is never 'right' here — right is the mirrored left view. */
function drawCharacter(ctx: Ctx, look: AvatarAppearance, direction: 'down' | 'up' | 'left', pose: Pose): void {
  const offsets = poseOffsets(pose);
  const shirtShadow = shade(look.shirt, 0.84);
  const skinShadow = shade(look.skin, 0.86);

  if (direction === 'left') {
    drawSideLegs(ctx, look, pose);
    ctx.save();
    ctx.translate(0, offsets.bodyDy);
    drawHairBack(ctx, look, 'left');
    // back arm, torso, front arm
    fillRoundRect(ctx, CX + 0.6 - offsets.armSwing, 21.8, 3.4, 9.2, 1.7, shade(look.shirt, 0.72));
    circle(ctx, CX + 2.3 - offsets.armSwing, 31.1, 1.6, skinShadow);
    fillRoundRect(ctx, CX - 1.9, 19.6, 3.8, 2.6, 1, look.skin);
    fillRoundRect(ctx, CX - 5.5, 21, 11, 11.5, 4.2, look.shirt);
    strokeRoundRect(ctx, CX - 5.5, 21, 11, 11.5, 4.2);
    ctx.fillStyle = 'rgba(0,0,0,0.08)';
    ctx.fillRect(CX - 5.2, 29.6, 10.4, 2.6);
    fillRoundRect(ctx, CX - 2.2 + offsets.armSwing, 21.6, 3.6, 9.4, 1.8, shirtShadow);
    circle(ctx, CX - 0.4 + offsets.armSwing, 31.1, 1.7, look.skin);
    drawHead(ctx, look, 'left');
    ctx.restore();
    return;
  }

  // front / back views share the body silhouette
  drawFrontLegs(ctx, look, offsets);
  ctx.save();
  ctx.translate(0, offsets.bodyDy);
  if (direction === 'down') drawHairBack(ctx, look, 'down');
  fillRoundRect(ctx, CX - 9.4, 21.6 + offsets.armSwing, 3.6, 9.2, 1.8, shirtShadow);
  fillRoundRect(ctx, CX + 5.8, 21.6 - offsets.armSwing, 3.6, 9.2, 1.8, shirtShadow);
  circle(ctx, CX - 7.6, 31 + offsets.armSwing, 1.7, look.skin);
  circle(ctx, CX + 7.6, 31 - offsets.armSwing, 1.7, look.skin);
  fillRoundRect(ctx, CX - 2, 19.5, 4, 2.8, 1, skinShadow);
  fillRoundRect(ctx, CX - 6.5, 21, 13, 11.5, 4.5, look.shirt);
  strokeRoundRect(ctx, CX - 6.5, 21, 13, 11.5, 4.5);
  ctx.fillStyle = 'rgba(0,0,0,0.08)';
  ctx.fillRect(CX - 6.1, 29.6, 12.2, 2.6);
  if (direction === 'down' && look.hairStyle !== 'WRAP') {
    ctx.beginPath();
    ctx.moveTo(CX - 2.6, 21.1);
    ctx.lineTo(CX, 23.7);
    ctx.lineTo(CX + 2.6, 21.1);
    ctx.closePath();
    ctx.fillStyle = look.skin;
    ctx.fill();
  }
  drawHead(ctx, look, direction);
  ctx.restore();
}

function drawFrontLegs(ctx: Ctx, look: AvatarAppearance, offsets: PoseOffsets): void {
  const pants = look.pants;
  fillRoundRect(ctx, CX - 5, 31.2, 3.8, 7.6 - offsets.leftLift, 1.4, pants);
  fillRoundRect(ctx, CX + 1.2, 31.2, 3.8, 7.6 - offsets.rightLift, 1.4, pants);
  fillRoundRect(ctx, CX - 5.4, 37.4 - offsets.leftLift, 4.6, 2.3, 1.1, SHOE);
  fillRoundRect(ctx, CX + 0.8, 37.4 - offsets.rightLift, 4.6, 2.3, 1.1, SHOE);
}

function drawSideLegs(ctx: Ctx, look: AvatarAppearance, pose: Pose): void {
  const stride = pose === 'stepA' ? 2.2 : pose === 'stepB' ? -2.2 : 0;
  const lift = pose === 'stepA' || pose === 'stepB' ? 0.8 : 0;
  const back = shade(look.pants, 0.75);
  fillRoundRect(ctx, CX - 1.6 - stride, 31.2, 3.6, 7.4, 1.4, back);
  fillRoundRect(ctx, CX - 2.8 - stride, 37.3, 4.4, 2.3, 1.1, SHOE);
  fillRoundRect(ctx, CX - 2 + stride, 31.2, 3.8, 7.6 - lift, 1.4, look.pants);
  fillRoundRect(ctx, CX - 3.3 + stride, 37.4 - lift, 4.7, 2.3, 1.1, SHOE);
}

function drawHead(ctx: Ctx, look: AvatarAppearance, view: 'down' | 'up' | 'left'): void {
  const wrap = look.hairStyle === 'WRAP';
  if (wrap) {
    drawWrap(ctx, look, view);
    return;
  }
  const earColor = shade(look.skin, 0.9);
  if (view === 'down') {
    circle(ctx, CX - HEAD_R + 0.3, HEAD_CY + 1.6, 1.9, earColor);
    circle(ctx, CX + HEAD_R - 0.3, HEAD_CY + 1.6, 1.9, earColor);
  }
  circle(ctx, CX, HEAD_CY, HEAD_R, look.skin);
  if (view === 'left') circle(ctx, CX - HEAD_R + 0.4, HEAD_CY + 2.6, 1.3, look.skin);
  strokeCircle(ctx, CX, HEAD_CY, HEAD_R);
  if (view !== 'up') drawFace(ctx, view);
  drawHairFront(ctx, look, view);
  if (view === 'left' && (look.hairStyle === 'SHORT' || look.hairStyle === 'BUZZ' || look.hairStyle === 'CURLY')) {
    circle(ctx, CX + 1.6, HEAD_CY + 1.9, 1.8, earColor);
  }
}

function drawFace(ctx: Ctx, view: 'down' | 'left'): void {
  const eye = '#1f2433';
  const blush = 'rgba(244, 114, 182, 0.28)';
  if (view === 'down') {
    ellipse(ctx, CX - 3.4, HEAD_CY + 1.5, 1.15, 1.45, eye);
    ellipse(ctx, CX + 3.4, HEAD_CY + 1.5, 1.15, 1.45, eye);
    circle(ctx, CX - 3.05, HEAD_CY + 0.95, 0.38, '#ffffff');
    circle(ctx, CX + 3.75, HEAD_CY + 0.95, 0.38, '#ffffff');
    circle(ctx, CX - 5.5, HEAD_CY + 4.2, 1.5, blush);
    circle(ctx, CX + 5.5, HEAD_CY + 4.2, 1.5, blush);
    ctx.beginPath();
    ctx.arc(CX, HEAD_CY + 3.9, 1.45, 0.2 * Math.PI, 0.8 * Math.PI);
    ctx.strokeStyle = 'rgba(120, 53, 53, 0.75)';
    ctx.lineWidth = 0.7;
    ctx.lineCap = 'round';
    ctx.stroke();
    return;
  }
  ellipse(ctx, CX - 4.7, HEAD_CY + 1.5, 1.05, 1.4, eye);
  circle(ctx, CX - 4.4, HEAD_CY + 0.95, 0.35, '#ffffff');
  circle(ctx, CX - 5.4, HEAD_CY + 4.3, 1.35, blush);
}

function hairCap(ctx: Ctx, color: string, bottomY: number, radiusBoost = 0.8, extraClip?: (ctx: Ctx) => void): void {
  ctx.save();
  ctx.beginPath();
  ctx.rect(CX - HEAD_R - 4, HEAD_CY - HEAD_R - 6, (HEAD_R + 4) * 2, bottomY - (HEAD_CY - HEAD_R - 6));
  extraClip?.(ctx);
  ctx.clip();
  circle(ctx, CX, HEAD_CY - 0.6, HEAD_R + radiusBoost, color);
  ctx.restore();
}

function backOfHeadClip(bottomOffset: number) {
  return (ctx: Ctx) => ctx.rect(CX - 1.2, HEAD_CY - HEAD_R - 6, HEAD_R + 6, HEAD_R + 6 + bottomOffset);
}

function drawHairBack(ctx: Ctx, look: AvatarAppearance, view: 'down' | 'left'): void {
  const color = shade(look.hair, 0.88);
  if (look.hairStyle === 'LONG') {
    if (view === 'down') fillRoundRect(ctx, CX - HEAD_R - 1.2, HEAD_CY - 2, HEAD_R * 2 + 2.4, 15.5, 4.5, color);
    else fillRoundRect(ctx, CX - 0.5, HEAD_CY - 2, HEAD_R + 1.8, 15, 4.5, color);
  }
}

function drawHairFront(ctx: Ctx, look: AvatarAppearance, view: 'down' | 'up' | 'left'): void {
  const hair = look.hair;
  const highlight = 'rgba(255,255,255,0.14)';
  switch (look.hairStyle) {
    case 'SHORT':
    case 'BUZZ': {
      const buzz = look.hairStyle === 'BUZZ';
      if (view === 'up') {
        hairCap(ctx, hair, HEAD_CY + (buzz ? 4 : 5.5), buzz ? 0.2 : 0.8);
      } else if (view === 'left') {
        hairCap(ctx, hair, HEAD_CY - (buzz ? 3.2 : 2.3), buzz ? 0.2 : 0.8, backOfHeadClip(buzz ? 3.5 : 4.8));
      } else {
        hairCap(ctx, hair, HEAD_CY - (buzz ? 3.4 : 2.4), buzz ? 0.2 : 0.8);
        if (!buzz) {
          fillRoundRect(ctx, CX - HEAD_R - 0.4, HEAD_CY - 4, 2.4, 5.4, 1.1, hair);
          fillRoundRect(ctx, CX + HEAD_R - 2, HEAD_CY - 4, 2.4, 5.4, 1.1, hair);
          ellipse(ctx, CX - 2.4, HEAD_CY - 3.3, 4.2, 2, hair, -0.35);
        }
      }
      if (!buzz) ellipse(ctx, CX - 2.6, HEAD_CY - 6.6, 2.6, 1.1, highlight, -0.4);
      return;
    }
    case 'LONG':
    case 'BOB': {
      const sideLength = look.hairStyle === 'LONG' ? 10 : 7;
      if (view === 'up') {
        hairCap(ctx, hair, HEAD_CY + 6);
        fillRoundRect(ctx, CX - HEAD_R + 0.2, HEAD_CY, HEAD_R * 2 - 0.4, look.hairStyle === 'LONG' ? 14 : 7.5, 4, hair);
      } else if (view === 'left') {
        hairCap(ctx, hair, HEAD_CY - 1.6, 0.8, backOfHeadClip(sideLength - 1));
        fillRoundRect(ctx, CX - 0.8, HEAD_CY - 3, HEAD_R + 1.8, sideLength + 3, 3.5, hair);
      } else {
        hairCap(ctx, hair, HEAD_CY - 1.8);
        fillRoundRect(ctx, CX - HEAD_R - 1, HEAD_CY - 4, 3.2, sideLength + 3, 1.6, hair);
        fillRoundRect(ctx, CX + HEAD_R - 2.2, HEAD_CY - 4, 3.2, sideLength + 3, 1.6, hair);
        ellipse(ctx, CX + 2.2, HEAD_CY - 3.1, 4.6, 2.1, hair, 0.3);
      }
      ellipse(ctx, CX - 2.6, HEAD_CY - 6.6, 2.8, 1.1, highlight, -0.4);
      return;
    }
    case 'BUN': {
      if (view === 'up') hairCap(ctx, hair, HEAD_CY + 5);
      else if (view === 'left') hairCap(ctx, hair, HEAD_CY - 2, 0.8, backOfHeadClip(4.5));
      else {
        hairCap(ctx, hair, HEAD_CY - 2.2);
        fillRoundRect(ctx, CX - HEAD_R - 0.4, HEAD_CY - 4, 2.4, 5, 1.1, hair);
        fillRoundRect(ctx, CX + HEAD_R - 2, HEAD_CY - 4, 2.4, 5, 1.1, hair);
      }
      const bunX = view === 'left' ? CX + 4.2 : CX;
      circle(ctx, bunX, HEAD_CY - HEAD_R - 1.1, 3.7, hair);
      circle(ctx, bunX - 1, HEAD_CY - HEAD_R - 2.1, 1.2, highlight);
      return;
    }
    case 'CURLY': {
      const bottom = view === 'up' ? HEAD_CY + 5 : HEAD_CY - 2;
      hairCap(ctx, hair, bottom, 1.2, view === 'left' ? backOfHeadClip(4.5) : undefined);
      const from = view === 'up' ? Math.PI * 0.95 : Math.PI * 1.08;
      const to = view === 'up' ? Math.PI * 2.05 : Math.PI * 1.92;
      for (let angle = from; angle <= to; angle += Math.PI / 7.5) {
        circle(ctx, CX + Math.cos(angle) * (HEAD_R + 0.4), HEAD_CY - 0.6 + Math.sin(angle) * (HEAD_R + 0.4), 3, hair);
      }
      if (view === 'left') {
        for (const dy of [-2, 1.5]) circle(ctx, CX + HEAD_R - 0.6, HEAD_CY + dy, 2.8, hair);
      }
      circle(ctx, CX - 3, HEAD_CY - 7, 1.3, highlight);
      return;
    }
    case 'WRAP':
      return;
  }
}

function drawWrap(ctx: Ctx, look: AvatarAppearance, view: 'down' | 'up' | 'left'): void {
  const fabric = look.hair;
  const fold = shade(fabric, 0.8);
  fillRoundRect(ctx, CX - HEAD_R - 1.7, HEAD_CY - 1, HEAD_R * 2 + 3.4, 11.5, 5.5, fold);
  circle(ctx, CX, HEAD_CY - 0.4, HEAD_R + 1.5, fabric);
  strokeCircle(ctx, CX, HEAD_CY - 0.4, HEAD_R + 1.5);
  if (view === 'up') {
    ellipse(ctx, CX - 2.5, HEAD_CY - 6, 3, 1.2, 'rgba(255,255,255,0.14)', -0.4);
    return;
  }
  const faceX = view === 'left' ? CX - 2.4 : CX;
  ellipse(ctx, faceX, HEAD_CY + 1.4, view === 'left' ? 5.2 : 6.4, 7, look.skin);
  ctx.beginPath();
  ctx.ellipse(faceX, HEAD_CY + 1.4, view === 'left' ? 5.2 : 6.4, 7, 0, 0, Math.PI * 2);
  ctx.strokeStyle = fold;
  ctx.lineWidth = 0.9;
  ctx.stroke();
  drawFace(ctx, view);
  ellipse(ctx, CX - 2.5, HEAD_CY - 7, 3, 1.1, 'rgba(255,255,255,0.16)', -0.4);
}

function strokeRoundRect(ctx: Ctx, x: number, y: number, width: number, height: number, radius: number): void {
  ctx.beginPath();
  ctx.roundRect(x, y, width, height, radius);
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = 0.75;
  ctx.stroke();
}

function strokeCircle(ctx: Ctx, cx: number, cy: number, radius: number): void {
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = 0.75;
  ctx.stroke();
}

/** Soft elliptical contact shadow shared by every avatar. */
export function ensureAvatarShadowTexture(scene: Phaser.Scene): string {
  const key = 'avatar-shadow';
  const { textureScale } = renderScaleOf(scene);
  createCanvasTexture(scene, key, 28, 10, textureScale, (ctx) => {
    ctx.translate(14, 5);
    ctx.scale(1, 0.36);
    const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, 13.5);
    gradient.addColorStop(0, 'rgba(15, 23, 42, 0.42)');
    gradient.addColorStop(0.6, 'rgba(15, 23, 42, 0.2)');
    gradient.addColorStop(1, 'rgba(15, 23, 42, 0)');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(0, 0, 13.5, 0, Math.PI * 2);
    ctx.fill();
  });
  return key;
}
