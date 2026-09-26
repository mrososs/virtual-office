<script setup lang="ts">
import { WifiOff } from 'lucide-vue-next';
</script>

<template>
  <div class="vo-panel flex items-center gap-2.5 border-rose-400/25 bg-rose-500/[0.08] px-3 py-2 text-xs text-rose-100/90 shadow-pop" role="status">
    <WifiOff :size="14" class="shrink-0 text-rose-300" />
    <span><span class="font-semibold">Disconnected.</span> Reconnecting… Statuses may be out of date until the connection is back.</span>
  </div>
</template>
