<script setup lang="ts">
import { Check, LoaderCircle } from 'lucide-vue-next';
import { computed } from 'vue';

import type { OfficePhase } from '@/features/office/composables/useOfficeExperience';
import { useOfficeStore } from '@/stores/office.store';

const props = defineProps<{ phase: OfficePhase }>();
const officeStore = useOfficeStore();

const steps = computed(() => {
  const dataDone = props.phase !== 'loading';
  return [
    { label: `Loading ${officeStore.organizationName || 'your company'}`, done: dataDone, active: !dataDone },
    { label: 'Starting the office engine', done: false, active: dataDone },
    { label: 'Seating everyone at their desks', done: false, active: false },
  ];
});
</script>

<template>
  <div class="absolute inset-0 z-30 flex items-center justify-center bg-canvas">
    <div class="w-[300px]">
      <div class="mb-6 flex items-center gap-3">
        <img src="/favicon.svg" alt="" class="h-9 w-9">
        <div>
          <p class="text-sm font-semibold">Opening the office</p>
          <p class="text-xs text-subtle">This only takes a moment.</p>
        </div>
      </div>
      <ol class="space-y-2.5">
        <li v-for="step in steps" :key="step.label" class="flex items-center gap-2.5 text-[13px]" :class="step.done || step.active ? 'text-ink' : 'text-subtle'">
          <span class="flex h-5 w-5 items-center justify-center rounded-full" :class="step.done ? 'bg-emerald-500/15 text-emerald-400' : 'bg-raised'">
            <Check v-if="step.done" :size="12" />
            <LoaderCircle v-else-if="step.active" :size="12" class="animate-spin text-accent" />
            <span v-else class="h-1.5 w-1.5 rounded-full bg-subtle/50" />
          </span>
          {{ step.label }}
        </li>
      </ol>
    </div>
  </div>
</template>
