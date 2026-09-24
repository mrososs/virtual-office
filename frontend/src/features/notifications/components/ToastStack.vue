<script setup lang="ts">
import { storeToRefs } from 'pinia';
import { computed } from 'vue';
import { useRoute } from 'vue-router';

import type { AppNotification } from '@/features/notifications/notification.types';
import { useNotificationStore } from '@/stores/notification.store';
import { useUiStore } from '@/stores/ui.store';

import { useNotificationActions } from '../composables/useNotificationActions';
import ToastItem from './ToastItem.vue';

const notificationStore = useNotificationStore();
const uiStore = useUiStore();
const { toasts } = storeToRefs(notificationStore);
const { run } = useNotificationActions();
const route = useRoute();
const besideDrawer = computed(() => uiStore.isDrawerOpen && route.path.startsWith('/office'));

function onAction(notification: AppNotification): void {
  if (notification.action) run(notification.action);
  notificationStore.dismissToast(notification.id);
}
</script>

<template>
  <div
    class="pointer-events-none fixed top-[60px] z-50 flex flex-col items-end gap-2 transition-[right] duration-200"
    :class="besideDrawer ? 'right-[392px]' : 'right-4'"
    aria-live="polite"
  >
    <TransitionGroup
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="opacity-0 translate-x-3"
      leave-active-class="transition duration-150 ease-in absolute"
      leave-to-class="opacity-0 translate-x-3"
      move-class="transition duration-200"
    >
      <ToastItem
        v-for="notification in toasts"
        :key="notification.id"
        :notification="notification"
        @dismiss="notificationStore.dismissToast(notification.id)"
        @action="onAction(notification)"
      />
    </TransitionGroup>
  </div>
</template>
