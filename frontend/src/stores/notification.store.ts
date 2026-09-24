import { defineStore } from 'pinia';

import type { AppNotification } from '@/features/notifications/notification.types';

const TOAST_LIMIT = 3;
const INBOX_LIMIT = 40;

interface NotificationStoreState {
  inbox: AppNotification[];
  toastIds: string[];
}

let sequence = 0;

/** Vue-only notifications: transient toasts plus the bell inbox. */
export const useNotificationStore = defineStore('notification', {
  state: (): NotificationStoreState => ({
    inbox: [],
    toastIds: [],
  }),

  getters: {
    toasts: (state): AppNotification[] =>
      state.toastIds
        .map((id) => state.inbox.find((notification) => notification.id === id))
        .filter((notification): notification is AppNotification => notification !== undefined),
    unreadCount: (state): number => state.inbox.filter((notification) => !notification.read).length,
  },

  actions: {
    notify(notification: Omit<AppNotification, 'id' | 'at' | 'read'>, options: { toast?: boolean } = {}): string {
      sequence += 1;
      const id = `ntf-${Date.now()}-${sequence}`;
      this.inbox = [{ ...notification, id, at: new Date().toISOString(), read: false }, ...this.inbox].slice(0, INBOX_LIMIT);
      if (options.toast !== false) {
        this.toastIds = [id, ...this.toastIds].slice(0, TOAST_LIMIT);
      }
      return id;
    },

    dismissToast(id: string): void {
      this.toastIds = this.toastIds.filter((toastId) => toastId !== id);
    },

    markAllRead(): void {
      for (const notification of this.inbox) notification.read = true;
    },

    clear(): void {
      this.inbox = [];
      this.toastIds = [];
    },
  },
});
