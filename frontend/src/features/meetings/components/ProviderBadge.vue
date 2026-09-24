<script setup lang="ts">
import type { MeetingProvider } from '@virtual-office/shared';
import { computed } from 'vue';

const props = defineProps<{ provider: MeetingProvider }>();

const meta = computed(
  () =>
    ({
      TEAMS: { label: 'Microsoft Teams', mark: 'T', color: '#5b5fc7' },
      GOOGLE_MEET: { label: 'Google Meet', mark: 'M', color: '#1e8e3e' },
      ZOOM: { label: 'Zoom', mark: 'Z', color: '#2d8cff' },
      OTHER: { label: 'Online meeting', mark: '•', color: '#64748b' },
    })[props.provider],
);
</script>

<template>
  <span class="inline-flex items-center gap-1.5 rounded-md border border-line/[0.08] bg-raised px-1.5 py-0.5 text-2xs font-medium text-muted">
    <span class="flex h-3.5 w-3.5 items-center justify-center rounded-[4px] text-[8.5px] font-bold text-white" :style="{ backgroundColor: meta.color }">{{ meta.mark }}</span>
    {{ meta.label }}
  </span>
</template>
