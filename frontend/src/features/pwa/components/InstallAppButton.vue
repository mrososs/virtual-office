<script setup lang="ts">
import { MonitorDown } from 'lucide-vue-next';

import { usePwaInstall } from '../install-prompt';

/** "Install iSaned Virtual Office" — renders nothing unless the browser can install the app right now. */
withDefaults(defineProps<{ variant?: 'menu' | 'button' }>(), { variant: 'button' });
const emit = defineEmits<{ installed: [] }>();

const { canInstall, promptInstall } = usePwaInstall();

async function install(): Promise<void> {
  if ((await promptInstall()) === 'accepted') emit('installed');
}
</script>

<template>
  <button
    v-if="canInstall && variant === 'menu'"
    type="button"
    class="flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left text-[13px] text-muted transition-colors hover:bg-hover hover:text-ink"
    @click="install"
  >
    <MonitorDown :size="14" /> Install iSaned Virtual Office
  </button>
  <button
    v-else-if="canInstall"
    type="button"
    class="inline-flex h-8 items-center gap-1.5 rounded-lg bg-accent px-3 text-[13px] font-medium text-accent-ink shadow-sm transition-colors hover:bg-accent/90"
    @click="install"
  >
    <MonitorDown :size="14" /> Install iSaned Virtual Office
  </button>
</template>
