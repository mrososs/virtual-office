<script setup lang="ts">
import { Bell, CheckCheck } from 'lucide-vue-next';
import { storeToRefs } from 'pinia';
import { shallowRef, useTemplateRef, watch } from 'vue';

import type { AppNotification } from '@/features/notifications/notification.types';
import { NOTIFICATION_ICONS, TONE_COLORS } from '@/features/notifications/notification-meta';
import { IconButton } from '@/shared/components';
import { useClickOutside } from '@/shared/composables';
import { formatRelativeTime } from '@/shared/utils/format';
import { useNotificationStore } from '@/stores/notification.store';

import { useNotificationActions } from '../composables/useNotificationActions';

const notificationStore = useNotificationStore();
const { inbox, unreadCount } = storeToRefs(notificationStore);
const { run } = useNotificationActions();

const open = shallowRef(false);
const root = useTemplateRef<HTMLElement>('root');
useClickOutside(root, open, () => (open.value = false));

// Opening the inbox marks everything as seen once it closes again.
watch(open, (isOpen, wasOpen) => {
  if (!isOpen && wasOpen) notificationStore.markAllRead();
});

function activate(notification: AppNotification): void {
  if (notification.action) run(notification.action);
  open.value = false;
}
</script>

<template>
  <div ref="root" class="relative">
    <IconButton label="Notifications" :active="open" @click="open = !open">
      <Bell :size="16" />
      <span
        v-if="unreadCount > 0"
        class="absolute right-1 top-1 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-accent px-1 text-[9px] font-bold text-white"
      >
        {{ unreadCount > 9 ? '9+' : unreadCount }}
      </span>
    </IconButton>

    <Transition
      enter-active-class="transition duration-150 ease-out"
      enter-from-class="opacity-0 -translate-y-1"
      leave-active-class="transition duration-100 ease-in"
      leave-to-class="opacity-0 -translate-y-1"
    >
      <div v-if="open" class="vo-panel absolute right-0 top-10 z-40 flex max-h-[440px] w-[340px] flex-col shadow-pop">
        <div class="flex items-center justify-between border-b border-line/[0.06] px-3 py-2.5">
          <p class="text-[13px] font-semibold">Notifications</p>
          <button
            v-if="unreadCount > 0"
            type="button"
            class="inline-flex items-center gap-1 text-2xs font-medium text-muted hover:text-ink"
            @click="notificationStore.markAllRead()"
          >
            <CheckCheck :size="12" /> Mark all read
          </button>
        </div>
        <ul v-if="inbox.length > 0" class="min-h-0 flex-1 overflow-y-auto p-1.5">
          <li v-for="notification in inbox" :key="notification.id">
            <button
              type="button"
              class="flex w-full items-start gap-2.5 rounded-lg px-2 py-2 text-left transition-colors hover:bg-hover/70"
              @click="activate(notification)"
            >
              <span
                class="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md"
                :style="{ backgroundColor: `${TONE_COLORS[notification.tone]}1f`, color: TONE_COLORS[notification.tone] }"
              >
                <component :is="NOTIFICATION_ICONS[notification.kind]" :size="13" />
              </span>
              <span class="min-w-0 flex-1">
                <span class="block text-xs font-medium leading-snug" :class="notification.read ? 'text-muted' : 'text-ink'">{{ notification.title }}</span>
                <span v-if="notification.body" class="block truncate text-2xs text-subtle">{{ notification.body }}</span>
              </span>
              <span class="shrink-0 text-[10px] text-subtle">{{ formatRelativeTime(notification.at) }}</span>
              <span v-if="!notification.read" class="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
            </button>
          </li>
        </ul>
        <p v-else class="px-3 py-8 text-center text-xs text-subtle">You're all caught up.</p>
      </div>
    </Transition>
  </div>
</template>
