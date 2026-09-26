<script setup lang="ts">
import { RefreshCw, X } from 'lucide-vue-next';
import { useRegisterSW } from 'virtual:pwa-register/vue';

const UPDATE_CHECK_MS = 60 * 60_000;

/**
 * Service worker registration + the update prompt. A new version is only
 * applied when the person clicks Update — never an unexpected reload in the
 * middle of the office. Offline readiness is deliberately not announced: the
 * office needs the server; only the app shell is cached.
 */
const { needRefresh, updateServiceWorker } = useRegisterSW({
  immediate: true,
  onRegisteredSW(_swUrl, registration) {
    // Long-lived desktop windows: look for new versions hourly, not only on launch.
    if (registration) window.setInterval(() => void registration.update(), UPDATE_CHECK_MS);
  },
});

function update(): void {
  void updateServiceWorker(true);
}
</script>

<template>
  <Transition
    enter-active-class="transition duration-200 ease-out"
    enter-from-class="opacity-0 translate-y-2"
    leave-active-class="transition duration-150 ease-in"
    leave-to-class="opacity-0 translate-y-2"
  >
    <div v-if="needRefresh" class="vo-panel fixed bottom-4 right-4 z-50 flex items-center gap-3 px-3.5 py-2.5 text-[13px] shadow-pop" role="status">
      <RefreshCw :size="14" class="text-accent" />
      <span class="font-medium text-ink">New version available</span>
      <button type="button" class="rounded-md bg-accent px-2.5 py-1 text-xs font-semibold text-accent-ink hover:bg-accent/90" @click="update">Update</button>
      <button type="button" class="rounded-md p-1 text-subtle hover:bg-hover hover:text-ink" aria-label="Later" @click="needRefresh = false"><X :size="13" /></button>
    </div>
  </Transition>
</template>
