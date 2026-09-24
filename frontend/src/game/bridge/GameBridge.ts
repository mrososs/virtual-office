/**
 * GameBridge is the ONLY channel allowed between the Vue layer and the
 * Phaser layer. Vue components/composables and Phaser scenes/systems must
 * communicate exclusively through `gameBridge.emit(...)` / `gameBridge.on(...)`.
 * Never import a Phaser Scene instance into a Vue component, and never
 * import a Vue component/store into a Phaser scene/system — go through the
 * bridge (and, on the game side, through `game/network` + `stores/*`
 * for state that must be shared).
 */
import mitt, { type Emitter } from 'mitt';

import type { GameEventPayloadMap } from './GameEvents';

type BridgeEmitter = Emitter<GameEventPayloadMap>;

class GameBridge {
  private readonly emitter: BridgeEmitter = mitt<GameEventPayloadMap>();

  on<K extends keyof GameEventPayloadMap>(
    event: K,
    handler: (payload: GameEventPayloadMap[K]) => void,
  ): void {
    this.emitter.on(event, handler);
  }

  off<K extends keyof GameEventPayloadMap>(
    event: K,
    handler: (payload: GameEventPayloadMap[K]) => void,
  ): void {
    this.emitter.off(event, handler);
  }

  emit<K extends keyof GameEventPayloadMap>(event: K, payload: GameEventPayloadMap[K]): void {
    this.emitter.emit(event, payload);
  }

  /** Removes every registered listener. Intended for hot-reload/teardown only. */
  clear(): void {
    this.emitter.all.clear();
  }
}

export const gameBridge = new GameBridge();
