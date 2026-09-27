<script setup lang="ts">
import { storeToRefs } from 'pinia';

import EmployeeDetailsDrawer from '@/features/employees/components/EmployeeDetailsDrawer.vue';
import GameStationPanel from '@/features/games/game-room/GameStationPanel.vue';
import MeetingDetailsDrawer from '@/features/meetings/components/MeetingDetailsDrawer.vue';
import { useUiStore } from '@/stores/ui.store';

import DeskDetailsPanel from './DeskDetailsPanel.vue';
import RoomDetailsPanel from './RoomDetailsPanel.vue';

const uiStore = useUiStore();
const { selection } = storeToRefs(uiStore);
</script>

<template>
  <div class="pointer-events-none absolute bottom-3 right-3 top-3 z-20 flex w-[360px] max-w-[calc(100%-1.5rem)] flex-col">
    <Transition
      mode="out-in"
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="opacity-0 translate-x-4"
      leave-active-class="transition duration-150 ease-in"
      leave-to-class="opacity-0 translate-x-4"
    >
      <EmployeeDetailsDrawer v-if="selection?.kind === 'employee'" :key="selection.id" :employee-id="selection.id" class="pointer-events-auto" @close="uiStore.clearSelection()" />
      <MeetingDetailsDrawer v-else-if="selection?.kind === 'meeting'" :key="selection.id" :meeting-id="selection.id" class="pointer-events-auto" @close="uiStore.clearSelection()" />
      <RoomDetailsPanel v-else-if="selection?.kind === 'room'" :key="selection.id" :room-id="selection.id" class="pointer-events-auto" @close="uiStore.clearSelection()" />
      <DeskDetailsPanel v-else-if="selection?.kind === 'desk'" :key="selection.id" :desk-id="selection.id" class="pointer-events-auto" @close="uiStore.clearSelection()" />
      <GameStationPanel v-else-if="selection?.kind === 'station'" :key="selection.id" :station-id="selection.id" class="pointer-events-auto" @close="uiStore.clearSelection()" />
    </Transition>
  </div>
</template>
