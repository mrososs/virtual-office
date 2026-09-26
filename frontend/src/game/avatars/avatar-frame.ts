import type { Direction } from '@virtual-office/shared';

import type { AvatarPose, AvatarView, BodyShape, PoseOffsets } from './avatar.types';

/** Logical frame size; the feet baseline is the sprite origin so `y` doubles as the depth key. */
export const AVATAR_FRAME_WIDTH = 32;
export const AVATAR_FRAME_HEIGHT = 42;
export const AVATAR_FEET_Y = 40;

export const AVATAR_VIEWS: readonly AvatarView[] = ['down', 'left', 'up'];
export const AVATAR_POSES: readonly AvatarPose[] = ['idle', 'breathe', 'stepA', 'stepB'];

/** Head geometry shared by the body, hair, clothing (occlusion) and accessory painters. */
export const CX = 16;
export const HEAD_CY = 13.5;
export const HEAD_R = 9;

/** Precomputed so the per-frame animation path never builds strings. */
export const FRAME_NAMES: Readonly<Record<AvatarView, Readonly<Record<AvatarPose, string>>>> = Object.fromEntries(
  AVATAR_VIEWS.map((view) => [view, Object.fromEntries(AVATAR_POSES.map((pose) => [pose, `${view}-${pose}`]))]),
) as Record<AvatarView, Record<AvatarPose, string>>;

const POSE_OFFSETS: Readonly<Record<AvatarPose, PoseOffsets>> = {
  idle: { bodyDy: 0, leftLift: 0, rightLift: 0, armSwing: 0, stride: 0, sideLift: 0 },
  breathe: { bodyDy: -0.5, leftLift: 0, rightLift: 0, armSwing: 0, stride: 0, sideLift: 0 },
  stepA: { bodyDy: -0.8, leftLift: 1.6, rightLift: 0, armSwing: 1.2, stride: 2.2, sideLift: 0.8 },
  stepB: { bodyDy: -0.8, leftLift: 0, rightLift: 1.6, armSwing: -1.2, stride: -2.2, sideLift: 0.8 },
};

export function poseOffsets(pose: AvatarPose): PoseOffsets {
  return POSE_OFFSETS[pose];
}

const BODY_SHAPES: Readonly<Record<string, BodyShape>> = {
  'body-regular': { torsoHalf: 6.5, sideHalf: 5.5, torsoRadius: 4.5, armX: 7.6, armWidth: 3.6, sideArmWidth: 3.6, legGap: 1.2, legWidth: 3.8 },
  'body-slim': { torsoHalf: 5.6, sideHalf: 4.9, torsoRadius: 4.2, armX: 6.8, armWidth: 3.2, sideArmWidth: 3.3, legGap: 1, legWidth: 3.5 },
  'body-broad': { torsoHalf: 7.6, sideHalf: 6.3, torsoRadius: 4.9, armX: 8.8, armWidth: 4, sideArmWidth: 4, legGap: 1.4, legWidth: 4.2 },
};

export function bodyShapeOf(bodyType: string): BodyShape {
  return BODY_SHAPES[bodyType] ?? (BODY_SHAPES['body-regular'] as BodyShape);
}

/** Which drawn view shows `direction`, and whether it is mirrored. */
export function viewForDirection(direction: Direction): { view: AvatarView; flip: boolean } {
  switch (direction) {
    case 'right':
      return { view: 'left', flip: true };
    case 'left':
      return { view: 'left', flip: false };
    case 'up':
      return { view: 'up', flip: false };
    default:
      return { view: 'down', flip: false };
  }
}

/* Limb geometry. Shared by the body painter (skin) and clothing painters (sleeves and occlusion cut-outs). */

export interface LimbRect {
  x: number;
  y: number;
  width: number;
  height: number;
  handX: number;
  handY: number;
  handRadius: number;
}

/** Front/back views: left and right arm (screen space), before the body bob is applied. */
export function frontArms(body: BodyShape, pose: PoseOffsets): [LimbRect, LimbRect] {
  const swing = pose.armSwing;
  const arm = (side: -1 | 1, dy: number): LimbRect => ({
    x: CX + side * body.armX - body.armWidth / 2,
    y: 21.6 + dy,
    width: body.armWidth,
    height: 9.2,
    handX: CX + side * body.armX,
    handY: 31 + dy,
    handRadius: 1.7,
  });
  return [arm(-1, swing), arm(1, -swing)];
}

/** Side view (facing left): the arm behind the torso and the one in front of it. */
export function sideArms(body: BodyShape, pose: PoseOffsets): { back: LimbRect; front: LimbRect } {
  const swing = pose.armSwing;
  const width = body.sideArmWidth;
  return {
    back: { x: CX + 0.6 - swing, y: 21.8, width: width - 0.2, height: 9.2, handX: CX + 0.6 - swing + (width - 0.2) / 2, handY: 31.1, handRadius: 1.6 },
    front: { x: CX - 2.2 + swing, y: 21.6, width, height: 9.4, handX: CX - 2.2 + swing + width / 2, handY: 31.1, handRadius: 1.7 },
  };
}

export interface LegRect {
  x: number;
  width: number;
  lift: number;
}

/** Front/back views. */
export function frontLegs(body: BodyShape, pose: PoseOffsets): [LegRect, LegRect] {
  return [
    { x: CX - body.legGap - body.legWidth, width: body.legWidth, lift: pose.leftLift },
    { x: CX + body.legGap, width: body.legWidth, lift: pose.rightLift },
  ];
}

/** Side view: the far leg (no lift) and the near leg. */
export function sideLegs(body: BodyShape, pose: PoseOffsets): { back: LegRect; front: LegRect } {
  return {
    back: { x: CX - 1.6 - pose.stride, width: body.legWidth - 0.2, lift: 0 },
    front: { x: CX - 2 + pose.stride, width: body.legWidth, lift: pose.sideLift },
  };
}

export const WAIST_Y = 30.6;
export const LEG_TOP_Y = 31.2;
export const ANKLE_Y = 38.8;
export const TORSO_TOP_Y = 21;
export const TORSO_HEIGHT = 11.5;
