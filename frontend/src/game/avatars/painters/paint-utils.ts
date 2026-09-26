import { CX, HEAD_CY, HEAD_R, frontArms, sideArms } from '@/game/avatars/avatar-frame';
import type { PaintContext } from '@/game/avatars/avatar.types';
import type { Ctx } from '@/game/rendering/canvas-texture';

export const OUTLINE = 'rgba(17, 22, 33, 0.42)';

export function strokeRoundRect(ctx: Ctx, x: number, y: number, width: number, height: number, radius: number, color = OUTLINE, lineWidth = 0.75): void {
  ctx.beginPath();
  ctx.roundRect(x, y, width, height, Math.min(radius, width / 2, height / 2));
  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth;
  ctx.stroke();
}

export function strokeCircle(ctx: Ctx, cx: number, cy: number, radius: number, color = OUTLINE, lineWidth = 0.75): void {
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth;
  ctx.stroke();
}

export function line(ctx: Ctx, x1: number, y1: number, x2: number, y2: number, color: string, lineWidth: number): void {
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth;
  ctx.lineCap = 'round';
  ctx.stroke();
}

export function polygon(ctx: Ctx, points: ReadonlyArray<readonly [number, number]>, color: string): void {
  ctx.beginPath();
  points.forEach(([x, y], index) => (index === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)));
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
}

/**
 * Erases `draw`'s shape from the current layer so the layer below shows
 * through. This is how occlusion is baked into clothing art: a shirt cuts
 * out the head and the near arm instead of knowing their skin color, so each
 * layer stays independent and cacheable on its own.
 */
export function carve(ctx: Ctx, draw: () => void): void {
  ctx.save();
  ctx.globalCompositeOperation = 'destination-out';
  ctx.fillStyle = '#000000';
  draw();
  ctx.restore();
}

/** Runs `draw` translated by the pose's upper-body bob (everything above the waist moves together). */
export function upperBody(paint: PaintContext, draw: () => void): void {
  paint.ctx.save();
  paint.ctx.translate(0, paint.pose.bodyDy);
  draw();
  paint.ctx.restore();
}

/** Call inside `upperBody`: the head in front of collars and hoods. */
export function carveHead(ctx: Ctx): void {
  carve(ctx, () => {
    ctx.beginPath();
    ctx.arc(CX, HEAD_CY, HEAD_R, 0, Math.PI * 2);
    ctx.fill();
  });
}

/** Call inside `upperBody`: hands (and in the side view the near arm) in front of this layer. */
export function carveArms(paint: PaintContext, options: { nearArm: boolean }): void {
  const { ctx, view, body, pose } = paint;
  carve(ctx, () => {
    ctx.beginPath();
    if (view === 'left') {
      const { front } = sideArms(body, pose);
      if (options.nearArm) ctx.roundRect(front.x, front.y, front.width, front.height, front.width / 2);
      ctx.moveTo(front.handX + front.handRadius + 0.2, front.handY);
      ctx.arc(front.handX, front.handY, front.handRadius + 0.2, 0, Math.PI * 2);
    } else {
      for (const arm of frontArms(body, pose)) {
        ctx.moveTo(arm.handX + arm.handRadius, arm.handY);
        ctx.arc(arm.handX, arm.handY, arm.handRadius, 0, Math.PI * 2);
      }
    }
    ctx.fill();
  });
}
