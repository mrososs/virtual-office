<script setup lang="ts">
/**
 * Composition root for app-level providers. Add new cross-cutting providers
 * (e.g. a toast/notification provider) here rather than in App.vue directly.
 */
import ThemeProvider from './ThemeProvider.vue';
</script>

<template>
  <ThemeProvider>
    <slot />
  </ThemeProvider>
</template>
