import type { AvatarAppearance } from '@virtual-office/shared';
import type Phaser from 'phaser';

import { createCanvasTexture } from '@/game/rendering/canvas-texture';
import { renderScaleOf } from '@/game/rendering/render-scale';

import { AVATAR_POSES, AVATAR_VIEWS, FRAME_NAMES } from './avatar-frame';
import type { AvatarLayerSpec } from './avatar.types';
import { layerFrameRect, layerSheetSize, paintLayerSheet } from './avatar-canvas';

let nextCacheId = 0;

/**
 * Generated layer sheets, shared by every avatar that uses the same layer
 * (same key) and reference-counted: a sheet is rasterized once, on first
 * use, and removed when no avatar needs it anymore (e.g. after someone
 * changes their outfit). Nothing is ever redrawn per frame.
 */
export class AvatarTextureCache {
  private readonly refs = new Map<string, number>();
  /** Texture keys are namespaced per cache, so two caches can never remove each other's textures. */
  private readonly prefix = `c${(nextCacheId += 1)}:`;

  constructor(private readonly scene: Phaser.Scene) {}

  /** Returns the texture key to use for this layer; pass the same key to `release`. */
  acquire(spec: AvatarLayerSpec, appearance: AvatarAppearance): string {
    const key = this.prefix + spec.key;
    const count = this.refs.get(key) ?? 0;
    if (count === 0 && !this.scene.textures.exists(key)) this.generate(key, spec, appearance);
    this.refs.set(key, count + 1);
    return key;
  }

  release(key: string): void {
    const count = this.refs.get(key);
    if (count === undefined) return;
    if (count > 1) {
      this.refs.set(key, count - 1);
      return;
    }
    this.refs.delete(key);
    if (this.scene.textures.exists(key)) this.scene.textures.remove(key);
  }

  /** Number of distinct layer textures alive (for the debug snapshot). */
  get size(): number {
    return this.refs.size;
  }

  destroy(): void {
    for (const key of this.refs.keys()) if (this.scene.textures.exists(key)) this.scene.textures.remove(key);
    this.refs.clear();
  }

  private generate(key: string, spec: AvatarLayerSpec, appearance: AvatarAppearance): void {
    const { textureScale } = renderScaleOf(this.scene);
    const size = layerSheetSize(spec);
    const texture = createCanvasTexture(this.scene, key, size.width, size.height, textureScale, (ctx) => paintLayerSheet(ctx, spec, appearance));
    if (!texture) throw new Error(`Could not create avatar layer texture ${key}`);
    for (const view of AVATAR_VIEWS) {
      for (const pose of AVATAR_POSES) {
        const rect = layerFrameRect(spec, view, pose);
        texture.add(FRAME_NAMES[view][pose], 0, rect.x * textureScale, rect.y * textureScale, rect.width * textureScale, rect.height * textureScale);
      }
    }
  }
}
