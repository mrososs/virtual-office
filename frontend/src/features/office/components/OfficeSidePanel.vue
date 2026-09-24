<script setup lang="ts">
import { useRouter } from 'vue-router';

import { DrawerShell } from '@/shared/components';

defineProps<{ title: string; subtitle?: string }>();
const router = useRouter();
</script>

<template>
  <div class="absolute bottom-3 left-3 top-3 z-20 flex w-[320px] max-w-[calc(100%-1.5rem)] flex-col">
    <DrawerShell class="h-full" @close="router.push({ name: 'office' })">
      <template #header>
        <h2 class="text-[15px] font-semibold text-ink">{{ title }}</h2>
        <p v-if="subtitle" class="mt-0.5 text-xs text-muted">{{ subtitle }}</p>
        <slot name="toolbar" />
      </template>
      <slot />
    </DrawerShell>
  </div>
</template>
