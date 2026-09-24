<script setup lang="ts">
import ToastStack from '@/features/notifications/components/ToastStack.vue';

import OfficeSidebar from './components/OfficeSidebar.vue';
import OfficeTopBar from './components/OfficeTopBar.vue';
</script>

<template>
  <div class="flex h-screen w-screen flex-col overflow-hidden bg-canvas text-ink">
    <OfficeTopBar />
    <div class="flex min-h-0 flex-1">
      <OfficeSidebar />
      <main class="relative min-w-0 flex-1 overflow-hidden">
        <RouterView />
      </main>
    </div>
    <ToastStack />
  </div>
</template>
