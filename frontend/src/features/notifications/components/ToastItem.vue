<script setup lang="ts">
import { X } from 'lucide-vue-next';
import { computed, onBeforeUnmount, onMounted } from 'vue';

import type { AppNotification } from '@/features/notifications/notification.types';
import { NOTIFICATION_ICONS, TONE_COLORS } from '@/features/notifications/notification-meta';

const TOAST_LIFETIME_MS = 6000;

const props = defineProps<{ notification: AppNotification }>();
const emit = defineEmits<{ dismiss: []; action: [] }>();

const icon = computed(() => NOTIFICATION_ICONS[props.notification.kind]);
const color = computed(() => TONE_COLORS[props.notification.tone]);

let timer = 0;
let remaining = TOAST_LIFETIME_MS;
let startedAt = 0;

function schedule(): void {
  startedAt = Date.now();
  timer = window.setTimeout(() => emit('dismiss'), remaining);
}

function pause(): void {
  window.clearTimeout(timer);
  remaining -= Date.now() - startedAt;
}

onMounted(schedule);
onBeforeUnmount(() => window.clearTimeout(timer));
</script>

<template>
  <div
    class="vo-panel pointer-events-auto flex w-[340px] items-start gap-3 p-3 shadow-pop"
    role="status"
    @mouseenter="pause"
    @mouseleave="schedule"
  >
    <span class="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg" :style="{ backgroundColor: `${color}1f`, color }">
      <component :is="icon" :size="15" />
    </span>
    <div class="min-w-0 flex-1">
      <p class="text-[13px] font-semibold leading-snug text-ink">{{ notification.title }}</p>
      <p v-if="notification.body" class="mt-0.5 truncate text-xs text-muted">{{ notification.body }}</p>
      <button
        v-if="notification.action"
        type="button"
        class="mt-2 inline-flex h-6 items-center rounded-md bg-accent/15 px-2 text-2xs font-semibold text-accent transition-colors hover:bg-accent/25"
        @click="emit('action')"
      >
        {{ notification.action.label }}
      </button>
    </div>
    <button type="button" class="-mr-1 -mt-1 rounded-md p-1 text-subtle transition-colors hover:bg-hover hover:text-ink" aria-label="Dismiss" @click="emit('dismiss')">
      <X :size="13" />
    </button>
  </div>
</template>
