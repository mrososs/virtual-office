<script setup lang="ts">
import { watch } from 'vue';

import { useNotificationStore } from '@/stores/notification.store';

import { usePwaInstall } from '../install-prompt';

import PwaUpdatePrompt from './PwaUpdatePrompt.vue';

/** App-wide PWA lifecycle UI: the update prompt, and a one-time tip after installing. */
const notifications = useNotificationStore();
const { installedThisSession } = usePwaInstall();

watch(installedThisSession, (installed) => {
  if (!installed) return;
  notifications.notify({
    kind: 'SYSTEM',
    tone: 'success',
    title: 'iSaned Virtual Office is installed',
    body: 'Want it to open when you sign in to Windows? In Edge: edge://apps → Details → Auto-start on device login (also in Settings → Desktop app).',
  });
});
</script>

<template>
  <PwaUpdatePrompt />
</template>
