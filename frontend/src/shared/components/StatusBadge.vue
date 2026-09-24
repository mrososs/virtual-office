<script setup lang="ts">
import { computed } from 'vue';

const props = withDefaults(
  defineProps<{
    color: string;
    label: string;
    pulse?: boolean;
    variant?: 'soft' | 'plain';
  }>(),
  { pulse: false, variant: 'soft' },
);

const style = computed(() =>
  props.variant === 'soft'
    ? { color: props.color, backgroundColor: `${props.color}1f`, borderColor: `${props.color}33` }
    : { color: props.color },
);
</script>

<template>
  <span
    class="inline-flex items-center gap-1.5 whitespace-nowrap text-2xs font-semibold"
    :class="variant === 'soft' && 'rounded-full border px-2 py-0.5'"
    :style="style"
  >
    <span class="relative inline-flex h-1.5 w-1.5">
      <span v-if="pulse" class="absolute inset-0 animate-live-pulse rounded-full" :style="{ backgroundColor: color }" />
      <span class="relative inline-block h-1.5 w-1.5 rounded-full" :style="{ backgroundColor: color }" />
    </span>
    {{ label }}
  </span>
</template>
