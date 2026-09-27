<script setup lang="ts">
import { findGameStation, GAME_TYPE_LABEL } from '@virtual-office/shared';
import { ExternalLink, Gamepad2, X } from 'lucide-vue-next';
import { computed } from 'vue';

import { useAuthStore } from '@/stores/auth.store';
import { useGameStore } from '@/stores/game.store';
import { useUiStore } from '@/stores/ui.store';

import { useGameRoomActions } from '../composables/useGameRoomActions';

/** Where you stand at a game table, from anywhere in the office: setting up, waiting, or playing (with a way back to the game). */
const gameStore = useGameStore();
const authStore = useAuthStore();
const uiStore = useUiStore();
const { leave, openExternal } = useGameRoomActions();

const stationId = computed(() => gameStore.stationIdOf(authStore.currentEmployeeId));
const station = computed(() => (stationId.value ? findGameStation(stationId.value) : undefined));
const external = computed(() => {
  const session = gameStore.session;
  return session?.kind === 'EXTERNAL' && session.stationId === stationId.value && session.endReason === null ? session : null;
});
/** Internal Pong has its own full-screen view while a match is on. */
const hidden = computed(() => gameStore.session?.kind === 'PONG' && gameStore.session.status !== 'ABANDONED');

const view = computed(() => {
  if (!station.value) return null;
  const game = GAME_TYPE_LABEL[station.value.gameType];
  const session = external.value;
  if (session?.status === 'IN_GAME') return { text: `Playing ${game}`, tone: 'playing' as const };
  if (session?.status === 'SETUP' && session.hostEmployeeId === authStore.currentEmployeeId) return { text: `Set up your ${game} room`, tone: 'waiting' as const };
  return { text: `Waiting for an opponent · ${station.value.name}`, tone: 'waiting' as const };
});
</script>

<template>
  <Transition
    enter-active-class="transition duration-150 ease-out"
    enter-from-class="opacity-0 translate-y-1"
    leave-active-class="transition duration-100 ease-in"
    leave-to-class="opacity-0 translate-y-1"
  >
    <div v-if="stationId && station && view && !hidden" class="vo-chip gap-2 py-1.5 pl-2.5 pr-1.5 text-xs text-ink" :class="view.tone === 'playing' ? 'border-accent/35' : 'border-amber-400/30'" role="status">
      <span class="relative inline-flex h-1.5 w-1.5">
        <span class="absolute inset-0 animate-live-pulse rounded-full" :class="view.tone === 'playing' ? 'bg-accent' : 'bg-amber-400'" />
        <span class="relative inline-block h-1.5 w-1.5 rounded-full" :class="view.tone === 'playing' ? 'bg-accent' : 'bg-amber-400'" />
      </span>
      <button type="button" class="inline-flex items-center gap-1.5 hover:text-accent" @click="uiStore.select({ kind: 'station', id: stationId })">
        <Gamepad2 :size="13" :class="view.tone === 'playing' ? 'text-accent' : 'text-amber-300'" />
        {{ view.text }}
      </button>
      <button
        v-if="external?.room"
        type="button"
        class="inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-2xs font-semibold text-accent hover:bg-hover"
        title="Open the game in a new tab"
        @click="openExternal(external.room.url)"
      >
        <ExternalLink :size="11" /> Open
      </button>
      <button type="button" class="rounded-full p-0.5 text-subtle hover:bg-hover hover:text-ink" :aria-label="`Leave the ${station.name}`" :title="`Leave the ${station.name}`" @click="leave(stationId)">
        <X :size="12" />
      </button>
    </div>
  </Transition>
</template>
