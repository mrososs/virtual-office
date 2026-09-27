<script setup lang="ts">
import { CalendarDays, Gamepad2, GitPullRequest, Hammer, ListChecks, MapPin, Wifi } from 'lucide-vue-next';
import { storeToRefs } from 'pinia';

import type { FeedItem, FeedItemKind, FeedTone } from '@/features/activity/activity-feed.types';
import EmployeeAvatar from '@/features/employees/components/EmployeeAvatar.vue';
import { formatClock } from '@/shared/utils/format';
import { useEmployeeStore } from '@/stores/employee.store';
import { useFeedStore } from '@/stores/feed.store';

const { items } = storeToRefs(useFeedStore());
const employeeStore = useEmployeeStore();

const KIND_ICON: Record<FeedItemKind, typeof CalendarDays> = {
  WORK_ITEM: ListChecks,
  PULL_REQUEST: GitPullRequest,
  BUILD: Hammer,
  MEETING: CalendarDays,
  PRESENCE: Wifi,
  LOCATION: MapPin,
  GAME: Gamepad2,
};

const TONE_COLOR: Record<FeedTone, string> = {
  neutral: '#9ba3b4',
  info: '#7c83ff',
  success: '#22c55e',
  warning: '#f59e0b',
  danger: '#ef4444',
};

function actorOf(item: FeedItem) {
  return item.actorEmployeeId ? employeeStore.byId(item.actorEmployeeId) : undefined;
}
</script>

<template>
  <TransitionGroup tag="ol" class="relative space-y-0.5" enter-active-class="transition duration-300 ease-out" enter-from-class="opacity-0 -translate-y-1">
    <li v-for="item in items" :key="item.id" class="flex gap-3 rounded-lg px-2 py-2">
      <span class="w-9 shrink-0 pt-0.5 text-right text-2xs tabular-nums text-subtle">{{ formatClock(item.at) }}</span>
      <span class="relative mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md" :style="{ backgroundColor: `${TONE_COLOR[item.tone]}1a`, color: TONE_COLOR[item.tone] }">
        <component :is="KIND_ICON[item.kind]" :size="12" />
      </span>
      <p class="min-w-0 flex-1 text-[12.5px] leading-snug text-muted">
        <template v-if="actorOf(item)">
          <EmployeeAvatar :employee="actorOf(item)!" size="xs" :show-presence="false" class="mr-1 align-[-5px]" />
          <span class="font-semibold text-ink">{{ actorOf(item)!.displayName.split(' ')[0] }}</span>
          {{ ' ' + item.text }}
        </template>
        <span v-else class="text-ink">{{ item.text }}</span>
      </p>
    </li>
  </TransitionGroup>
</template>
