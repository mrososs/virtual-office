import Phaser from 'phaser';
import { onBeforeUnmount, onMounted, shallowRef, type ShallowRef } from 'vue';

import { createGameConfig } from '@/game/config';
import { computeRenderScale } from '@/game/rendering/render-scale';
import { useOfficeStore } from '@/stores/office.store';

/**
 * Owns the Phaser.Game instance lifecycle for a mounted container. This is
 * the ONLY place Vue touches the Phaser.Game object — everything else goes
 * through `game/bridge/GameBridge`. The canvas renders at devicePixelRatio
 * and follows the container size (panels, window resizes) via ResizeObserver.
 */
export function useOfficeGame(container: Readonly<ShallowRef<HTMLElement | null>>) {
  const officeStore = useOfficeStore();
  const game = shallowRef<Phaser.Game | null>(null);
  let observer: ResizeObserver | null = null;
  let resizeFrame = 0;
  let disposed = false;
  let dpr = 1;

  onMounted(async () => {
    const element = container.value;
    if (!element) return;
    officeStore.setGameStatus('booting');

    // Phaser rasterizes text once; make sure the UI font is ready first.
    await Promise.race([
      document.fonts?.load('600 12px "Inter Variable"').catch(() => undefined),
      new Promise((resolve) => window.setTimeout(resolve, 1500)),
    ]);
    if (disposed) return;

    // Same clamping as the game config, so canvas backing size and CSS size always agree.
    dpr = computeRenderScale(window.devicePixelRatio || 1).dpr;
    const { width, height } = element.getBoundingClientRect();
    try {
      game.value = new Phaser.Game(createGameConfig(element, width, height, dpr));
    } catch (error) {
      officeStore.setGameStatus('error', error instanceof Error ? error.message : 'Could not start the office renderer');
      return;
    }

    observer = new ResizeObserver(() => {
      cancelAnimationFrame(resizeFrame);
      resizeFrame = requestAnimationFrame(resize);
    });
    observer.observe(element);
  });

  function resize(): void {
    const element = container.value;
    const instance = game.value;
    if (!element || !instance) return;
    const { width, height } = element.getBoundingClientRect();
    if (width < 1 || height < 1) return;
    instance.scale.resize(Math.round(width * dpr), Math.round(height * dpr));
  }

  onBeforeUnmount(() => {
    disposed = true;
    observer?.disconnect();
    cancelAnimationFrame(resizeFrame);
    game.value?.destroy(true);
    game.value = null;
  });

  return { game };
}
