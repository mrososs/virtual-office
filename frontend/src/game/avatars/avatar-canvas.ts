import type { AvatarAppearance } from '@virtual-office/shared';

import { AVATAR_FRAME_WIDTH, AVATAR_POSES, AVATAR_VIEWS, bodyShapeOf, poseOffsets } from './avatar-frame';
import type { AvatarLayerSpec, AvatarPose, AvatarView } from './avatar.types';
import { resolveAvatarLayers } from './AvatarAssetRegistry';

/**
 * Canvas 2D compositing shared by both renderers:
 * - Phaser rasterizes each layer once into a sheet (`paintLayerSheet`) and
 *   animates by switching frames on per-layer sprites.
 * - The Vue avatar creator draws whole frames (`drawAvatarFrame`) for its
 *   live preview, option thumbnails and profile portraits.
 * Same painters, same layer order, so the preview is exactly what the office shows.
 */

export function layerBandHeight(spec: AvatarLayerSpec): number {
  return spec.band.bottom - spec.band.top;
}

/** Logical size of a layer sheet: poses across, views down. */
export function layerSheetSize(spec: AvatarLayerSpec): { width: number; height: number } {
  return { width: AVATAR_FRAME_WIDTH * AVATAR_POSES.length, height: layerBandHeight(spec) * AVATAR_VIEWS.length };
}

/** Logical rect of one frame inside a layer sheet. */
export function layerFrameRect(spec: AvatarLayerSpec, view: AvatarView, pose: AvatarPose): { x: number; y: number; width: number; height: number } {
  const height = layerBandHeight(spec);
  return { x: AVATAR_POSES.indexOf(pose) * AVATAR_FRAME_WIDTH, y: AVATAR_VIEWS.indexOf(view) * height, width: AVATAR_FRAME_WIDTH, height };
}

/**
 * Paints every view × pose of one layer. Each cell is clipped, so a layer's
 * occlusion cut-outs never leak into neighboring frames.
 */
export function paintLayerSheet(ctx: CanvasRenderingContext2D, spec: AvatarLayerSpec, appearance: AvatarAppearance): void {
  const body = bodyShapeOf(appearance.bodyType);
  for (const view of AVATAR_VIEWS) {
    for (const pose of AVATAR_POSES) {
      const cell = layerFrameRect(spec, view, pose);
      ctx.save();
      ctx.beginPath();
      ctx.rect(cell.x, cell.y, cell.width, cell.height);
      ctx.clip();
      ctx.translate(cell.x, cell.y - spec.band.top);
      spec.paint({ ctx, view, pose: poseOffsets(pose), body }, appearance);
      ctx.restore();
    }
  }
}

let scratch: HTMLCanvasElement | null = null;

/** One reusable offscreen canvas: each layer is painted in isolation, then composited. */
function scratchContext(width: number, height: number): CanvasRenderingContext2D | null {
  scratch ??= document.createElement('canvas');
  if (scratch.width < width || scratch.height < height) {
    scratch.width = Math.max(scratch.width, width);
    scratch.height = Math.max(scratch.height, height);
  }
  const ctx = scratch.getContext('2d');
  if (!ctx) return null;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  // Clear everything, not just the copied rect: smoothed drawImage samples a pixel beyond the
  // source rect, which would bleed stale content from earlier (larger) renders into the edges.
  ctx.clearRect(0, 0, scratch.width, scratch.height);
  return ctx;
}

export interface FrameDrawOptions {
  /** Top-left of the 32 × 42 frame in target pixels (hair may extend slightly above it). */
  x: number;
  y: number;
  /** Target pixels per frame pixel. */
  scale: number;
}

/**
 * Draws one full avatar frame into `target`, layer by layer in game order.
 * Layers must be painted separately because clothing cuts shapes out of
 * itself; painting them all on one canvas would erase the layers beneath.
 */
export function drawAvatarFrame(
  target: CanvasRenderingContext2D,
  appearance: AvatarAppearance,
  view: AvatarView,
  pose: AvatarPose,
  flip: boolean,
  options: FrameDrawOptions,
): void {
  const body = bodyShapeOf(appearance.bodyType);
  const offsets = poseOffsets(pose);
  const { scale } = options;
  const frameWidth = Math.ceil(AVATAR_FRAME_WIDTH * scale);

  target.save();
  target.translate(options.x, options.y);
  if (flip) {
    target.translate(AVATAR_FRAME_WIDTH * scale, 0);
    target.scale(-1, 1);
  }
  for (const spec of resolveAvatarLayers(appearance)) {
    if (!spec) continue;
    const height = Math.ceil(layerBandHeight(spec) * scale);
    const ctx = scratchContext(frameWidth, height);
    if (!ctx || !scratch) continue;
    ctx.scale(scale, scale);
    ctx.translate(0, -spec.band.top);
    spec.paint({ ctx, view, pose: offsets, body }, appearance);
    target.drawImage(scratch, 0, 0, frameWidth, height, 0, spec.band.top * scale, frameWidth, height);
  }
  target.restore();
}
