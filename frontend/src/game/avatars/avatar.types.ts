import type { AvatarAppearance } from '@virtual-office/shared';

/**
 * Framework-free avatar rendering types. Nothing in this folder that the Vue
 * avatar creator imports (types, frame geometry, painters, registry, canvas
 * compositing, animation controller) may import Phaser at runtime — the
 * creator's live preview draws with exactly the same painters as the game.
 */

/** Views that are actually drawn. Facing right is the mirrored `left` view. */
export type AvatarView = 'down' | 'left' | 'up';

export type AvatarPose = 'idle' | 'breathe' | 'stepA' | 'stepB';

/**
 * One sprite per slot, rendered back to front in `AVATAR_LAYER_ORDER`.
 * `hairBack` exists so long hair can sit behind the shoulders.
 */
export type AvatarLayerSlot = 'hairBack' | 'body' | 'bottom' | 'shoes' | 'top' | 'hair' | 'accessory';

/** Per-pose offsets shared by every layer, so all layers move as one body. */
export interface PoseOffsets {
  /** Vertical bob of everything above the waist. */
  bodyDy: number;
  /** Front/back views: how far each foot is lifted. */
  leftLift: number;
  rightLift: number;
  /** Horizontal arm swing (front/back views and side view). */
  armSwing: number;
  /** Side view: horizontal leg stride and front-foot lift. */
  stride: number;
  sideLift: number;
}

/** Proportions that differ per body type; clothing is drawn to fit them. */
export interface BodyShape {
  torsoHalf: number;
  sideHalf: number;
  torsoRadius: number;
  armX: number;
  armWidth: number;
  sideArmWidth: number;
  legGap: number;
  legWidth: number;
}

export interface PaintContext {
  ctx: CanvasRenderingContext2D;
  view: AvatarView;
  pose: PoseOffsets;
  body: BodyShape;
}

export type LayerPainter = (paint: PaintContext, appearance: AvatarAppearance) => void;

/** Vertical slice of the 32 px-wide frame a layer can draw into (frame px; may exceed 0..42). */
export interface LayerBand {
  top: number;
  bottom: number;
}

/** A layer as resolved for one appearance: what to draw and the cache key of the result. */
export interface AvatarLayerSpec {
  slot: AvatarLayerSlot;
  /** Identical keys produce identical sheets, so avatars share generated textures. */
  key: string;
  band: LayerBand;
  paint: LayerPainter;
}

/** Anything that can show one frame of every layer at once (Phaser renderer, canvas preview). */
export interface AvatarFrameTarget {
  showFrame(view: AvatarView, pose: AvatarPose, flip: boolean): void;
}
