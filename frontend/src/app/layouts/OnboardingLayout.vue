<script setup lang="ts">
import ToastStack from '@/features/notifications/components/ToastStack.vue';
import { CompanyBrand } from '@/shared/components';

/** Full-screen shell for steps before entering the office (first-time avatar setup). */
</script>

<template>
  <div class="flex h-screen w-screen flex-col overflow-hidden bg-canvas text-ink">
    <header class="flex h-12 shrink-0 items-center border-b border-line/[0.06] bg-surface/80 px-4 backdrop-blur-md">
      <CompanyBrand />
    </header>
    <main class="min-h-0 flex-1 overflow-y-auto">
      <RouterView />
    </main>
    <ToastStack />
  </div>
</template>
