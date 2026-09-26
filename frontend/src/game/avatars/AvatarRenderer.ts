import { DEFAULT_AVATAR_APPEARANCE, avatarAppearanceKey, normalizeAvatarAppearance, type AvatarAppearance } from '@virtual-office/shared';
import Phaser from 'phaser';

import { renderScaleOf } from '@/game/rendering/render-scale';

import { AVATAR_FEET_Y, FRAME_NAMES } from './avatar-frame';
import type { AvatarFrameTarget, AvatarLayerSpec, AvatarPose, AvatarView } from './avatar.types';
import { AVATAR_LAYER_BANDS, AVATAR_LAYER_ORDER, resolveAvatarLayers } from './AvatarAssetRegistry';
import type { AvatarTextureCache } from './AvatarTextureCache';

const EMPTY_TEXTURE = '__DEFAULT';

/**
 * Draws one avatar as stacked layer sprites (hair back, body, bottom, shoes,
 * top, hair, accessory) inside the owner's Container, so they move, sort and
 * fade as a single object. Swapping an outfit only re-textures the layers
 * whose key changed; the rest of the avatar is untouched.
 */
export class AvatarRenderer implements AvatarFrameTarget {
  private readonly sprites: Phaser.GameObjects.Sprite[];
  /** Texture key held per slot (what we release). */
  private readonly keys: Array<string | null>;
  /** Layer key per slot (what the look asks for); lets unchanged layers be skipped on a re-skin. */
  private readonly layerKeys: Array<string | null>;
  private appearanceKey = '';
  private view: AvatarView = 'down';
  private pose: AvatarPose = 'idle';
  private flip = false;
  private disposed = false;

  constructor(
    scene: Phaser.Scene,
    parent: Phaser.GameObjects.Container,
    private readonly textures: AvatarTextureCache,
    appearance: AvatarAppearance,
  ) {
    const scale = 1 / renderScaleOf(scene).textureScale;
    this.sprites = AVATAR_LAYER_ORDER.map((slot) => {
      const band = AVATAR_LAYER_BANDS[slot];
      const sprite = new Phaser.GameObjects.Sprite(scene, 0, 0, EMPTY_TEXTURE)
        .setScale(scale)
        .setOrigin(0.5, (AVATAR_FEET_Y - band.top) / (band.bottom - band.top))
        .setVisible(false);
      parent.add(sprite);
      return sprite;
    });
    this.keys = this.sprites.map(() => null);
    this.layerKeys = this.sprites.map(() => null);
    this.setAppearance(appearance);
  }

  /** Returns true when something visibly changed. Invalid input falls back per field, never to "nothing". */
  setAppearance(input: AvatarAppearance): boolean {
    if (this.disposed) return false;
    const appearance = normalizeAvatarAppearance(input);
    const key = avatarAppearanceKey(appearance);
    if (key === this.appearanceKey) return false;
    this.appearanceKey = key;

    const layers = resolveAvatarLayers(appearance);
    const frame = FRAME_NAMES[this.view][this.pose];
    layers.forEach((spec, index) => {
      const sprite = this.sprites[index];
      const previous = this.keys[index] ?? null;
      if (!sprite || (spec?.key ?? null) === this.layerKeys[index]) return;
      this.layerKeys[index] = spec?.key ?? null;
      if (spec) {
        sprite.setTexture(this.acquire(spec, appearance, index), frame).setFlipX(this.flip).setVisible(true);
      } else {
        sprite.setVisible(false);
        this.keys[index] = null;
      }
      if (previous) this.textures.release(previous);
    });
    return true;
  }

  showFrame(view: AvatarView, pose: AvatarPose, flip: boolean): void {
    if (view === this.view && pose === this.pose && flip === this.flip) return;
    this.view = view;
    this.pose = pose;
    this.flip = flip;
    const frame = FRAME_NAMES[view][pose];
    for (let index = 0; index < this.sprites.length; index += 1) {
      if (this.keys[index]) this.sprites[index]?.setFrame(frame).setFlipX(flip);
    }
  }

  get appearanceKeyValue(): string {
    return this.appearanceKey;
  }

  /** Compact per-layer state for the dev debug handle. */
  debugLayers(): Array<{ slot: string; key: string | null; frame: string | null; flipX: boolean; x: number; y: number; visible: boolean }> {
    return this.sprites.map((sprite, index) => ({
      slot: AVATAR_LAYER_ORDER[index] ?? '?',
      key: this.keys[index] ?? null,
      frame: this.keys[index] ? String(sprite.frame.name) : null,
      flipX: sprite.flipX,
      x: sprite.x,
      y: sprite.y,
      visible: sprite.visible,
    }));
  }

  /** Releases this avatar's layer textures. The sprites themselves die with the parent container. */
  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    for (const key of this.keys) if (key) this.textures.release(key);
    this.keys.fill(null);
    this.layerKeys.fill(null);
  }

  /** A painter bug must never make a character vanish: fall back to the default look for that layer. */
  private acquire(spec: AvatarLayerSpec, appearance: AvatarAppearance, index: number): string {
    let key: string;
    try {
      key = this.textures.acquire(spec, appearance);
    } catch (error) {
      console.warn(`[avatar] layer ${spec.key} failed to render; using the default look`, error);
      const defaults = resolveAvatarLayers(DEFAULT_AVATAR_APPEARANCE);
      const fallback = defaults[index] ?? defaults[AVATAR_LAYER_ORDER.indexOf('body')];
      if (!fallback) throw error;
      key = this.textures.acquire(fallback, DEFAULT_AVATAR_APPEARANCE);
    }
    this.keys[index] = key;
    return key;
  }
}
