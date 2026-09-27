<script setup lang="ts">
import { findGameStation } from '@virtual-office/shared';
import { storeToRefs } from 'pinia';
import { computed } from 'vue';

import { firstNameOf } from '@/shared/utils/names';
import { useAuthStore } from '@/stores/auth.store';
import { useEmployeeStore } from '@/stores/employee.store';
import { useGameStore } from '@/stores/game.store';
import { useUiStore } from '@/stores/ui.store';

const uiStore = useUiStore();
const gameStore = useGameStore();
const employeeStore = useEmployeeStore();
const authStore = useAuthStore();
const { interaction, selection } = storeToRefs(uiStore);

function stationText(stationId: string): string {
  const name = findGameStation(stationId)?.name ?? 'Game';
  const state = gameStore.stationOf(stationId);
  if (!state) return name;
  const mine = state.participants.some((participant) => participant.employeeId === authStore.currentEmployeeId);
  if (mine) return `${name} · you're at the table`;
  if (state.status === 'AVAILABLE') return `${name} · Play`;
  if (state.status === 'WAITING') {
    const waiting = state.participants[0] ? employeeStore.byId(state.participants[0].employeeId)?.displayName : undefined;
    return `${name} · ${waiting ? firstNameOf(waiting) : 'Someone'} is ${state.joinable ? 'waiting' : 'setting up'}`;
  }
  return `${name} · In game`;
}

const text = computed(() => {
  const target = interaction.value;
  if (!target) return null;
  if (target.kind === 'STATION') return stationText(target.id);
  if (target.kind === 'EMPLOYEE') return `View ${target.label}`;
  if (target.kind === 'DESK') return `View ${target.label}`;
  return `About ${target.label}`;
});
const alreadyOpen = computed(() => {
  const target = interaction.value;
  const current = selection.value;
  return !!target && !!current && current.id === target.id;
});

/** Same as pressing E — so touch and mouse users can interact too. */
function activate(): void {
  const target = interaction.value;
  if (!target) return;
  const kind = { EMPLOYEE: 'employee', DESK: 'desk', ROOM: 'room', STATION: 'station' } as const;
  uiStore.select({ kind: kind[target.kind], id: target.id });
}
</script>

<template>
  <Transition
    enter-active-class="transition duration-150 ease-out"
    enter-from-class="opacity-0 translate-y-1"
    leave-active-class="transition duration-100 ease-in"
    leave-to-class="opacity-0 translate-y-1"
  >
    <button v-if="text && !alreadyOpen" type="button" class="vo-chip gap-2 py-1.5 pl-1.5 pr-3 text-xs text-ink hover:border-accent/40" @click="activate">
      <kbd class="vo-kbd">E</kbd>
      {{ text }}
    </button>
  </Transition>
</template>
