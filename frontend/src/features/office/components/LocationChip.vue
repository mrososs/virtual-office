<script setup lang="ts">
import { MapPin, Radio } from 'lucide-vue-next';
import { computed } from 'vue';

import { useOfficeStore } from '@/stores/office.store';
import { useRoomStore } from '@/stores/room.store';
import { useUiStore } from '@/stores/ui.store';

const uiStore = useUiStore();
const roomStore = useRoomStore();
const officeStore = useOfficeStore();

const room = computed(() => (uiStore.localRoomId ? roomStore.byId(uiStore.localRoomId) : undefined));
const others = computed(() => (room.value ? Math.max(0, roomStore.occupantsOf(room.value.id).length - 1) : 0));

const realtime = computed(() => {
  switch (officeStore.realtimeStatus) {
    case 'connected':
      return { label: uiStore.liveEmployeeIds.length > 0 ? `Live · ${uiStore.liveEmployeeIds.length} connected` : 'Live', color: '#22c55e' };
    case 'connecting':
      return { label: 'Connecting…', color: '#f59e0b' };
    case 'disconnected':
      return { label: 'Realtime offline', color: '#ef4444' };
    default:
      return { label: 'Local only', color: '#6b7385' };
  }
});
</script>

<template>
  <div class="vo-chip gap-2 py-1.5 text-xs">
    <MapPin :size="13" class="text-accent" />
    <span class="text-ink">{{ room ? room.name : 'Hallway' }}</span>
    <span v-if="room && others > 0" class="text-subtle">· {{ others }} here</span>
    <span class="mx-0.5 h-3 w-px bg-line/10" />
    <span class="inline-flex items-center gap-1" :title="officeStore.realtimeStatus === 'disabled' ? 'Start the backend with DEMO_MODE=true for multiplayer' : undefined">
      <Radio :size="12" :style="{ color: realtime.color }" />
      <span class="text-muted">{{ realtime.label }}</span>
    </span>
  </div>
</template>
