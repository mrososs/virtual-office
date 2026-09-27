import Phaser from 'phaser';

import { computeRenderScale, RENDER_SCALE_REGISTRY_KEY } from '@/game/rendering/render-scale';
import { BootScene } from '@/game/scenes/BootScene';
import { OfficeScene } from '@/game/scenes/OfficeScene';
import { PreloadScene } from '@/game/scenes/PreloadScene';

/**
 * Builds the Phaser.Game config. The canvas renders at device resolution
 * (backing store = CSS size x devicePixelRatio, CSS-downscaled via
 * `scale.zoom`) so text and vector graphics stay crisp on HiDPI screens.
 * The owning Vue composable resizes it when its container changes size.
 */
export function createGameConfig(parent: HTMLElement, cssWidth: number, cssHeight: number, devicePixelRatio: number): Phaser.Types.Core.GameConfig {
  const renderScale = computeRenderScale(devicePixelRatio);
  return {
    type: Phaser.AUTO,
    parent,
    width: Math.max(1, Math.round(cssWidth * renderScale.dpr)),
    height: Math.max(1, Math.round(cssHeight * renderScale.dpr)),
    backgroundColor: '#0c0f15',
    banner: false,
    scale: {
      mode: Phaser.Scale.NONE,
      zoom: 1 / renderScale.dpr,
    },
    render: {
      antialias: true,
      pixelArt: false,
      roundPixels: false,
      powerPreference: 'high-performance',
    },
    input: {
      keyboard: true,
      mouse: { preventDefaultWheel: true },
    },
    // All audio goes through core/audio's SoundManager; Phaser must not open its own AudioContext on boot.
    audio: { noAudio: true },
    physics: {
      default: 'arcade',
      arcade: { gravity: { x: 0, y: 0 }, debug: false },
    },
    callbacks: {
      preBoot: (game) => {
        game.registry.set(RENDER_SCALE_REGISTRY_KEY, renderScale);
      },
    },
    scene: [BootScene, PreloadScene, OfficeScene],
  };
}
