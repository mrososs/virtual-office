import { avatarColorHex } from '@virtual-office/shared';

import { CX, HEAD_CY, HEAD_R, LEG_TOP_Y, TORSO_HEIGHT, TORSO_TOP_Y, frontArms, frontLegs, sideArms, sideLegs } from '@/game/avatars/avatar-frame';
import type { AvatarView, LayerPainter } from '@/game/avatars/avatar.types';
import { circle, ellipse, fillRoundRect, shade, type Ctx } from '@/game/rendering/canvas-texture';

import { strokeCircle, upperBody } from './paint-utils';

const EYE = '#1f2433';
const BLUSH = 'rgba(244, 114, 182, 0.28)';

/**
 * The skin layer: legs, arms, hands, neck, head and face. Clothing and hair
 * are drawn over it by other layers; anything that must stay visible in
 * front of them (hands, the near arm, the face) is cut out of those layers.
 */
export const paintBody: LayerPainter = (paint, appearance) => {
  const { ctx, view, body, pose } = paint;
  const skin = avatarColorHex('skinTone', appearance.skinTone);
  const skinShadow = shade(skin, 0.86);

  if (view === 'left') {
    const legs = sideLegs(body, pose);
    fillRoundRect(ctx, legs.back.x, LEG_TOP_Y, legs.back.width, 7.4, 1.4, shade(skin, 0.8));
    fillRoundRect(ctx, legs.front.x, LEG_TOP_Y, legs.front.width, 7.6 - legs.front.lift, 1.4, skin);
    upperBody(paint, () => {
      const arms = sideArms(body, pose);
      fillRoundRect(ctx, arms.back.x, arms.back.y, arms.back.width, arms.back.height, arms.back.width / 2, shade(skin, 0.78));
      circle(ctx, arms.back.handX, arms.back.handY, arms.back.handRadius, skinShadow);
      fillRoundRect(ctx, CX - 1.9, 19.6, 3.8, 2.6, 1, skin);
      fillRoundRect(ctx, CX - body.sideHalf, TORSO_TOP_Y, body.sideHalf * 2, TORSO_HEIGHT, 4.2, skinShadow);
      fillRoundRect(ctx, arms.front.x, arms.front.y, arms.front.width, arms.front.height, arms.front.width / 2, shade(skin, 0.93));
      circle(ctx, arms.front.handX, arms.front.handY, arms.front.handRadius, skin);
      drawHead(ctx, skin, 'left');
    });
    return;
  }

  for (const leg of frontLegs(body, pose)) fillRoundRect(ctx, leg.x, LEG_TOP_Y, leg.width, 7.6 - leg.lift, 1.4, skin);
  upperBody(paint, () => {
    for (const arm of frontArms(body, pose)) {
      fillRoundRect(ctx, arm.x, arm.y, arm.width, arm.height, arm.width / 2, shade(skin, 0.93));
      circle(ctx, arm.handX, arm.handY, arm.handRadius, skin);
    }
    fillRoundRect(ctx, CX - 2, 19.5, 4, 2.8, 1, skinShadow);
    fillRoundRect(ctx, CX - body.torsoHalf, TORSO_TOP_Y, body.torsoHalf * 2, TORSO_HEIGHT, body.torsoRadius, skinShadow);
    drawHead(ctx, skin, view);
  });
};

function drawHead(ctx: Ctx, skin: string, view: AvatarView): void {
  const ear = shade(skin, 0.9);
  if (view !== 'left') {
    circle(ctx, CX - HEAD_R + 0.3, HEAD_CY + 1.6, 1.9, ear);
    circle(ctx, CX + HEAD_R - 0.3, HEAD_CY + 1.6, 1.9, ear);
  }
  circle(ctx, CX, HEAD_CY, HEAD_R, skin);
  if (view === 'left') circle(ctx, CX - HEAD_R + 0.4, HEAD_CY + 2.6, 1.3, skin);
  strokeCircle(ctx, CX, HEAD_CY, HEAD_R);
  if (view === 'left') {
    circle(ctx, CX + 1.6, HEAD_CY + 1.9, 1.8, ear);
    ctx.beginPath();
    ctx.arc(CX + 1.6, HEAD_CY + 1.9, 0.9, Math.PI * 0.6, Math.PI * 1.6);
    ctx.strokeStyle = shade(skin, 0.72);
    ctx.lineWidth = 0.5;
    ctx.stroke();
  }
  if (view !== 'up') drawFace(ctx, view);
}

function drawFace(ctx: Ctx, view: 'down' | 'left'): void {
  if (view === 'down') {
    ellipse(ctx, CX - 3.4, HEAD_CY + 1.5, 1.15, 1.45, EYE);
    ellipse(ctx, CX + 3.4, HEAD_CY + 1.5, 1.15, 1.45, EYE);
    circle(ctx, CX - 3.05, HEAD_CY + 0.95, 0.38, '#ffffff');
    circle(ctx, CX + 3.75, HEAD_CY + 0.95, 0.38, '#ffffff');
    circle(ctx, CX - 5.5, HEAD_CY + 4.2, 1.5, BLUSH);
    circle(ctx, CX + 5.5, HEAD_CY + 4.2, 1.5, BLUSH);
    ctx.beginPath();
    ctx.arc(CX, HEAD_CY + 3.9, 1.45, 0.2 * Math.PI, 0.8 * Math.PI);
    ctx.strokeStyle = 'rgba(120, 53, 53, 0.75)';
    ctx.lineWidth = 0.7;
    ctx.lineCap = 'round';
    ctx.stroke();
    return;
  }
  ellipse(ctx, CX - 4.7, HEAD_CY + 1.5, 1.05, 1.4, EYE);
  circle(ctx, CX - 4.4, HEAD_CY + 0.95, 0.35, '#ffffff');
  circle(ctx, CX - 5.4, HEAD_CY + 4.3, 1.35, BLUSH);
}
