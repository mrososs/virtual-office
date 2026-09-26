import Phaser from 'phaser';

import { COMPANY_BRANDING } from '@/core/config/branding';
import { GAME_EVENTS, gameBridge } from '@/game/bridge';
import { ensureAvatarShadowTexture } from '@/game/rendering/avatar-shadow';
import { ensureBadgeTextures } from '@/game/rendering/badge-textures';
import { ensureDeskTextures, ensureFurnitureTexture, FURNITURE_CATALOG } from '@/game/rendering/furniture-textures';
import type { FurnitureKind } from '@/game/maps/office-map.types';

/**
 * Loads the only bitmap asset (the company logo) and generates the shared
 * procedural textures (furniture, desks, badges, shadows) up front so the
 * office never hitches on first render. Avatar layer textures are generated
 * per look when avatars spawn.
 */
export class PreloadScene extends Phaser.Scene {
  constructor() {
    super('PreloadScene');
  }

  preload(): void {
    // A missing logo must never block the office: signage falls back to the company name.
    this.load.image(COMPANY_BRANDING.logoAssetKey, COMPANY_BRANDING.logoSource);
  }

  create(): void {
    // Checked here rather than via loader events: a file that downloads but fails to decode never emits FILE_LOAD_ERROR.
    if (!this.textures.exists(COMPANY_BRANDING.logoAssetKey) && import.meta.env.DEV) {
      console.warn(`[branding] Company logo could not be loaded from ${COMPANY_BRANDING.logoSource} — showing "${COMPANY_BRANDING.companyName}" as text signage instead.`);
    }
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
