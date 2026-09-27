import { HQ_ROOM, type RoomType, type UUID } from '@virtual-office/shared';
import { onBeforeUnmount, watch } from 'vue';

import { soundManager, type SoundId } from '@/core/audio';
import { GAME_EVENTS } from '@/game/bridge';
import { useGameBridgeEvent } from '@/shared/composables';
import { useUiStore } from '@/stores/ui.store';

/** Re-entering the same room within this window (dithering in a doorway) stays silent. */
const ROOM_CUE_COOLDOWN_MS = 10_000;

const ROOM_TYPE_CUE: Partial<Record<RoomType, SoundId>> = {
  MEETING: 'room-meeting',
  MANAGEMENT: 'room-office',
  PROJECT_MANAGEMENT: 'room-office',
  CODE_REVIEW: 'room-collaboration',
};

/**
 * The office's contextual sounds. Room cues play only when the local player
 * crosses into an important room (RoomSystem reports transitions, never
 * "still inside"); the Game Room is the only room with ambience; opening a
 * details panel gets a soft tick. Footsteps live in Phaser (FootstepSystem).
 */
export function useOfficeSounds(): void {
  const uiStore = useUiStore();
  const lastCueAt = new Map<UUID, number>();

  useGameBridgeEvent(GAME_EVENTS.PLAYER_ENTERED_ROOM, ({ roomId, roomType }) => {
    if (roomId === HQ_ROOM.game) soundManager.setLoop('game-room-ambience', true);
    const cue = roomId === HQ_ROOM.game ? 'room-game' : ROOM_TYPE_CUE[roomType];
    if (!cue) return;
    const now = performance.now();
    if (now - (lastCueAt.get(roomId) ?? Number.NEGATIVE_INFINITY) < ROOM_CUE_COOLDOWN_MS) return;
    lastCueAt.set(roomId, now);
    soundManager.play(cue);
  });

  useGameBridgeEvent(GAME_EVENTS.PLAYER_LEFT_ROOM, ({ roomId }) => {
    if (roomId === HQ_ROOM.game) soundManager.setLoop('game-room-ambience', false);
  });

  watch(
    () => uiStore.selection,
    (selection, previous) => {
      if (selection && !previous) soundManager.play('ui-open');
    },
  );

  onBeforeUnmount(() => soundManager.setLoop('game-room-ambience', false));
}
