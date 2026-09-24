import { onScopeDispose } from 'vue';

import type { GameEventPayloadMap } from '@/game/bridge/GameEvents';
import { gameBridge } from '@/game/bridge/GameBridge';

/**
 * Subscribes to a GameBridge event for the lifetime of the current effect
 * scope (component or composable). Subscribes immediately — not on mount —
 * so events emitted while children mount are never missed. This is the
 * recommended way for Vue code to listen to Phaser; never import a scene.
 */
export function useGameBridgeEvent<K extends keyof GameEventPayloadMap>(
  event: K,
  handler: (payload: GameEventPayloadMap[K]) => void,
): void {
  gameBridge.on(event, handler);
  onScopeDispose(() => gameBridge.off(event, handler));
}
