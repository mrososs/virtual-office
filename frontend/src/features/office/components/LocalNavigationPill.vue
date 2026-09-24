<script setup lang="ts">
import { Footprints, X } from 'lucide-vue-next';
import { storeToRefs } from 'pinia';

import { useOfficeCommands } from '@/features/office/composables/useOfficeCommands';
import { useUiStore } from '@/stores/ui.store';

const { localNavigationLabel } = storeToRefs(useUiStore());
const { cancelWalk } = useOfficeCommands();
</script>

<template>
  <Transition
    enter-active-class="transition duration-150 ease-out"
    enter-from-class="opacity-0 -translate-y-1"
    leave-active-class="transition duration-100 ease-in"
    leave-to-class="opacity-0 -translate-y-1"
  >
    <div v-if="localNavigationLabel" class="vo-chip gap-2 border-accent/30 py-1.5 pl-2.5 pr-1.5 text-xs text-ink" role="status">
      <Footprints :size="13" class="text-accent" />
      {{ localNavigationLabel }}
      <span class="text-subtle">· move to take over</span>
      <button type="button" class="rounded-full p-0.5 text-subtle hover:bg-hover hover:text-ink" aria-label="Stop walking" @click="cancelWalk">
        <X :size="12" />
      </button>
    </div>
  </Transition>
</template>
