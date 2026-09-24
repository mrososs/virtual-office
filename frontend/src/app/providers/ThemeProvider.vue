<script lang="ts">
export type Theme = 'dark' | 'light';

export const THEME_INJECTION_KEY = Symbol('theme');
</script>

<script setup lang="ts">
/**
 * Applies the color-scheme class to <html> and provides it down the tree.
 * Placeholder — only a single dark theme exists today.
 */
import { provide } from 'vue';

// TODO: read the persisted user preference once settings feature has one.
const theme: Theme = 'dark';
provide(THEME_INJECTION_KEY, theme);
</script>

<template>
  <div :data-theme="theme" class="contents">
    <slot />
  </div>
</template>
