import Phaser from 'phaser';

import { GAME_EVENTS, gameBridge } from '@/game/bridge';
import { ensureBadgeTextures } from '@/game/rendering/badge-textures';
import { ensureAvatarShadowTexture } from '@/game/rendering/character-textures';
import { ensureDeskTextures, ensureFurnitureTexture, FURNITURE_CATALOG } from '@/game/rendering/furniture-textures';
import type { FurnitureKind } from '@/game/maps/office-map.types';

/**
 * Generates the shared procedural textures (furniture, desks, badges,
 * shadows) up front so the office never hitches on first render. Character
 * textures are generated per appearance when avatars spawn.
 */
export class PreloadScene extends Phaser.Scene {
  constructor() {
    super('PreloadScene');
  }

  create(): void {
    try {
      for (const kind of Object.keys(FURNITURE_CATALOG) as FurnitureKind[]) ensureFurnitureTexture(this, kind);
      ensureDeskTextures(this);
      ensureBadgeTextures(this);
      ensureAvatarShadowTexture(this);
    } catch (error) {
      gameBridge.emit(GAME_EVENTS.GAME_ERROR, { message: error instanceof Error ? error.message : 'Could not prepare office graphics' });
      return;
    }
    this.scene.start('OfficeScene');
  }
}
