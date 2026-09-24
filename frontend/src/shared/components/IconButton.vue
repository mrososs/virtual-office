<script setup lang="ts">
withDefaults(
  defineProps<{
    label: string;
    active?: boolean;
    size?: 'sm' | 'md';
  }>(),
  { active: false, size: 'md' },
);
</script>

<template>
  <button
    type="button"
    :aria-label="label"
    :title="label"
    class="inline-flex shrink-0 items-center justify-center rounded-lg text-muted transition-colors duration-150 hover:bg-hover hover:text-ink"
    :class="[size === 'sm' ? 'h-7 w-7' : 'h-8 w-8', active && 'bg-hover text-ink']"
  >
    <slot />
  </button>
</template>
