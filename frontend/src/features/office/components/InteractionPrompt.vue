<script setup lang="ts">
import { storeToRefs } from 'pinia';
import { computed } from 'vue';

import { useUiStore } from '@/stores/ui.store';

const { interaction, selection } = storeToRefs(useUiStore());

const text = computed(() => {
  const target = interaction.value;
  if (!target) return null;
  if (target.kind === 'EMPLOYEE') return `View ${target.label}`;
  if (target.kind === 'DESK') return `View ${target.label}`;
  return `About ${target.label}`;
});
const alreadyOpen = computed(() => {
  const target = interaction.value;
  const current = selection.value;
  return !!target && !!current && current.id === target.id;
});
</script>

<template>
  <Transition
    enter-active-class="transition duration-150 ease-out"
    enter-from-class="opacity-0 translate-y-1"
    leave-active-class="transition duration-100 ease-in"
    leave-to-class="opacity-0 translate-y-1"
  >
    <div v-if="text && !alreadyOpen" class="vo-chip gap-2 py-1.5 pl-1.5 pr-3 text-xs text-ink">
      <kbd class="vo-kbd">E</kbd>
      {{ text }}
    </div>
  </Transition>
</template>
