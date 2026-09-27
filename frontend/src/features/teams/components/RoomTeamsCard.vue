<script setup lang="ts">
import type { UUID } from '@virtual-office/shared';
import { X } from 'lucide-vue-next';
import { computed, shallowRef, watch } from 'vue';

import { ROOM_ICONS } from '@/features/employees/activity-icons';
import { IconButton } from '@/shared/components';
import { ROOM_TYPE_META } from '@/shared/constants';
import { useRoomStore } from '@/stores/room.store';
import { useUiStore } from '@/stores/ui.store';

import RoomTeamsPanel from './RoomTeamsPanel.vue';

/**
 * Appears while you stand in a collaboration or meeting room: who is here and
 * the room's Teams actions. It never opens Teams by itself. Closing it hides
 * it until you enter a room again; an open details drawer takes its place.
 */
const uiStore = useUiStore();
const roomStore = useRoomStore();

const dismissedRoomId = shallowRef<UUID | null>(null);
const room = computed(() => {
  const current = uiStore.localRoomId ? roomStore.byId(uiStore.localRoomId) : undefined;
  return current && (current.type === 'CODE_REVIEW' || current.type === 'MEETING') ? current : undefined;
});
const visible = computed(() => !!room.value && dismissedRoomId.value !== room.value.id && !uiStore.isDrawerOpen);

watch(
  () => uiStore.localRoomId,
  () => (dismissedRoomId.value = null),
);
</script>

<template>
  <Transition
    enter-active-class="transition duration-150 ease-out"
    enter-from-class="opacity-0 translate-y-1"
    leave-active-class="transition duration-100 ease-in"
    leave-to-class="opacity-0 translate-y-1"
  >
    <aside v-if="visible && room" class="vo-panel w-[320px] max-w-[calc(100vw-2rem)] p-3.5" :aria-label="`${room.name}: Teams`">
      <header class="mb-2.5 flex items-center gap-2.5">
        <span class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg" :style="{ backgroundColor: `${ROOM_TYPE_META[room.type].color}22`, color: ROOM_TYPE_META[room.type].color }">
          <component :is="ROOM_ICONS[room.type]" :size="15" />
        </span>
        <h2 class="min-w-0 flex-1 truncate text-[13px] font-semibold text-ink">{{ room.name }}</h2>
        <IconButton label="Hide" size="sm" @click="dismissedRoomId = room.id"><X :size="14" /></IconButton>
      </header>
      <RoomTeamsPanel :room-id="room.id" />
    </aside>
  </Transition>
</template>
