<script setup lang="ts">
/** Shell for unauthenticated routes (login, etc). */
</script>

<template>
  <div class="flex h-screen w-screen items-center justify-center bg-canvas text-ink">
    <div class="vo-panel w-full max-w-sm p-8">
      <RouterView />
    </div>
  </div>
</template>
