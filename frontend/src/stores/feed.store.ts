import { defineStore } from 'pinia';

import type { FeedItem } from '@/features/activity/activity-feed.types';

const FEED_LIMIT = 60;

interface FeedStoreState {
  items: FeedItem[];
}

let sequence = 0;

export const useFeedStore = defineStore('feed', {
  state: (): FeedStoreState => ({
    items: [],
  }),

  actions: {
    setItems(items: FeedItem[]): void {
      this.items = [...items].sort((a, b) => b.at.localeCompare(a.at)).slice(0, FEED_LIMIT);
    },

    push(item: Omit<FeedItem, 'id' | 'at'>): void {
      sequence += 1;
      this.items = [{ ...item, id: `feed-${Date.now()}-${sequence}`, at: new Date().toISOString() }, ...this.items].slice(0, FEED_LIMIT);
    },
  },
});
