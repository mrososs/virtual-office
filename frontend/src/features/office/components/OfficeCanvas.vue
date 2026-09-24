<script setup lang="ts">
/**
 * Mounts the Phaser canvas. Never reaches into `game/scenes` directly —
 * all state flows through GameBridge (see useOfficeWorldSync).
 */
import { useTemplateRef } from 'vue';

import { useOfficeGame } from '@/features/office/composables/useOfficeGame';

const container = useTemplateRef<HTMLElement>('container');
useOfficeGame(container);
</script>

<template>
  <div ref="container" class="office-canvas overflow-hidden" role="application" aria-label="Virtual office — use WASD or arrow keys to move, E to interact" />
</template>

<style scoped>
.office-canvas :deep(canvas) {
  display: block;
  outline: none;
}
</style>
