<script setup lang="ts">
import { computed } from 'vue';

import type { Size } from '@/shared/types';

const props = withDefaults(
  defineProps<{
    variant?: 'primary' | 'secondary' | 'ghost';
    size?: Exclude<Size, 'lg'>;
    disabled?: boolean;
    block?: boolean;
    type?: 'button' | 'submit';
  }>(),
  {
    variant: 'secondary',
    size: 'md',
    disabled: false,
    block: false,
    type: 'button',
  },
);

const classes = computed(() => [
  'inline-flex items-center justify-center gap-1.5 rounded-lg font-medium transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-45',
  props.size === 'sm' ? 'h-7 px-2.5 text-xs' : 'h-8 px-3 text-[13px]',
  props.block && 'w-full',
  props.variant === 'primary' && 'bg-accent text-accent-ink shadow-sm hover:bg-accent/90',
  props.variant === 'secondary' && 'border border-line/10 bg-raised text-ink hover:bg-hover',
  props.variant === 'ghost' && 'text-muted hover:bg-hover hover:text-ink',
]);
</script>

<template>
  <button :type="type" :disabled="disabled" :class="classes">
    <slot />
  </button>
</template>
