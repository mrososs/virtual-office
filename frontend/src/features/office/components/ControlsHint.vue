<script setup lang="ts">
import { X } from 'lucide-vue-next';
import { onBeforeUnmount, onMounted, shallowRef } from 'vue';

const STORAGE_KEY = 'vo:controls-hint-dismissed';
const AUTO_HIDE_MS = 12_000;

const visible = shallowRef(false);
let timer = 0;

function dismiss(): void {
  visible.value = false;
  window.clearTimeout(timer);
  window.removeEventListener('keydown', onKey);
  try {
    window.localStorage.setItem(STORAGE_KEY, '1');
  } catch {
    // Non-critical: the hint simply shows again next time.
  }
}

function onKey(event: KeyboardEvent): void {
  if (['w', 'a', 's', 'd', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key)) {
    timer = window.setTimeout(dismiss, 2500);
    window.removeEventListener('keydown', onKey);
  }
}

onMounted(() => {
  let dismissed = false;
  try {
    dismissed = window.localStorage.getItem(STORAGE_KEY) === '1';
  } catch {
    dismissed = false;
  }
  if (dismissed) return;
  visible.value = true;
  timer = window.setTimeout(dismiss, AUTO_HIDE_MS);
  window.addEventListener('keydown', onKey);
});

onBeforeUnmount(() => {
  window.clearTimeout(timer);
  window.removeEventListener('keydown', onKey);
});
</script>

<template>
  <Transition leave-active-class="transition duration-300 ease-in" leave-to-class="opacity-0 translate-y-1">
    <div v-if="visible" class="vo-chip gap-3 py-2 pl-3 pr-2 text-xs text-muted">
      <span class="inline-flex items-center gap-1">
        <kbd class="vo-kbd">W</kbd><kbd class="vo-kbd">A</kbd><kbd class="vo-kbd">S</kbd><kbd class="vo-kbd">D</kbd>
        <span class="ml-1">move</span>
      </span>
      <span class="inline-flex items-center gap-1"><kbd class="vo-kbd">E</kbd> interact</span>
      <span class="hidden items-center gap-1 sm:inline-flex"><kbd class="vo-kbd">Esc</kbd> close</span>
      <span class="hidden sm:inline">scroll to zoom</span>
      <button type="button" class="rounded-full p-1 text-subtle hover:bg-hover hover:text-ink" aria-label="Dismiss hint" @click="dismiss">
        <X :size="12" />
      </button>
    </div>
  </Transition>
</template>
