<script setup lang="ts">
import { LocateFixed, Minus, Plus } from 'lucide-vue-next';
import { storeToRefs } from 'pinia';
import { computed } from 'vue';

import { useOfficeCommands } from '@/features/office/composables/useOfficeCommands';
import { IconButton } from '@/shared/components';
import { useUiStore } from '@/stores/ui.store';

const uiStore = useUiStore();
const { zoom, cameraFollowingPlayer, isDrawerOpen } = storeToRefs(uiStore);
const { setZoom, recenter } = useOfficeCommands();
const current = computed(() => zoom.value ?? 1);
</script>

<template>
  <div class="absolute bottom-3 z-10 flex items-center gap-1.5 transition-[right] duration-200" :class="isDrawerOpen ? 'right-[384px]' : 'right-3'">
    <button
      v-if="!cameraFollowingPlayer"
      type="button"
      class="vo-chip gap-1.5 py-1.5 text-xs text-ink transition-colors hover:bg-hover"
      @click="recenter"
    >
      <LocateFixed :size="13" class="text-accent" /> Back to me
    </button>
    <div class="vo-panel flex items-center gap-0.5 p-1" role="group" aria-label="Zoom">
      <IconButton label="Zoom out" size="sm" @click="setZoom(current - 0.15)"><Minus :size="14" /></IconButton>
      <button type="button" class="min-w-[44px] rounded-md px-1 text-center text-2xs font-semibold tabular-nums text-muted hover:text-ink" title="Reset zoom" @click="setZoom(1)">
        {{ Math.round(current * 100) }}%
      </button>
      <IconButton label="Zoom in" size="sm" @click="setZoom(current + 0.15)"><Plus :size="14" /></IconButton>
    </div>
  </div>
</template>
