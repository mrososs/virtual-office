import type Phaser from 'phaser';

/**
 * The canvas renders at devicePixelRatio (see features/office/useOfficeGame),
 * so the camera zoom and every generated texture / text object must be
 * scaled accordingly to stay crisp.
 */
export interface RenderScale {
  dpr: number;
  /** Supersampling factor for procedurally drawn canvas textures. */
  textureScale: number;
  /** Resolution for Phaser.Text objects (they are re-rasterized, not scaled). */
  textResolution: number;
}

export const RENDER_SCALE_REGISTRY_KEY = 'vo:renderScale';

export function computeRenderScale(devicePixelRatio: number): RenderScale {
  const dpr = Math.min(Math.max(devicePixelRatio, 1), 2);
  return {
    dpr,
    textureScale: dpr >= 1.75 ? 3 : 2,
    textResolution: Math.min(4, Math.ceil(dpr * 2)),
  };
}

export function renderScaleOf(scene: Phaser.Scene): RenderScale {
  return (scene.registry.get(RENDER_SCALE_REGISTRY_KEY) as RenderScale | undefined) ?? computeRenderScale(1);
}
