import { normalizeAvatarAppearance } from '@virtual-office/shared';
import type Phaser from 'phaser';

import { AvatarAnimationController } from './AvatarAnimationController';
import { AvatarRenderer } from './AvatarRenderer';
import { AvatarTextureCache } from './AvatarTextureCache';

export interface AvatarInstance {
  readonly renderer: AvatarRenderer;
  readonly animation: AvatarAnimationController;
}

/**
 * Builds avatars for one office world: validates the appearance (anything
 * invalid falls back to defaults), wires a layered renderer to a single
 * animation controller, and owns the shared layer-texture cache. Used for
 * the local player, NPC employees and remote players alike.
 */
export class AvatarFactory {
  private readonly textures: AvatarTextureCache;

  constructor(private readonly scene: Phaser.Scene) {
    this.textures = new AvatarTextureCache(scene);
  }

  /** Adds the avatar's layer sprites to `parent` (the object that moves). */
  create(parent: Phaser.GameObjects.Container, appearance: unknown): AvatarInstance {
    const renderer = new AvatarRenderer(this.scene, parent, this.textures, normalizeAvatarAppearance(appearance));
    return { renderer, animation: new AvatarAnimationController(renderer) };
  }

  get textureCount(): number {
    return this.textures.size;
  }

  destroy(): void {
    this.textures.destroy();
  }
}
