<script setup lang="ts">
import { GitPullRequest, Hammer, Users, Video } from 'lucide-vue-next';
import { computed } from 'vue';

import { useEmployeeStore } from '@/stores/employee.store';
import { useMeetingStore } from '@/stores/meeting.store';
import { useWorkStore } from '@/stores/work.store';

const employeeStore = useEmployeeStore();
const meetingStore = useMeetingStore();
const workStore = useWorkStore();

const stats = computed(() => [
  { key: 'online', icon: Users, value: employeeStore.onlineCount, label: 'online', color: '#22c55e' },
  { key: 'meetings', icon: Video, value: meetingStore.liveCount, label: meetingStore.liveCount === 1 ? 'meeting live' : 'meetings live', color: '#3b82f6' },
  { key: 'builds', icon: Hammer, value: workStore.runningBuildCount, label: workStore.runningBuildCount === 1 ? 'build running' : 'builds running', color: '#eab308' },
  { key: 'reviews', icon: GitPullRequest, value: workStore.openReviewCount, label: workStore.openReviewCount === 1 ? 'PR in review' : 'PRs in review', color: '#f97316' },
]);
</script>

<template>
  <ul class="flex flex-wrap gap-1.5" aria-label="Office at a glance">
    <li v-for="stat in stats" :key="stat.key" class="vo-chip">
      <component :is="stat.icon" :size="12" :style="{ color: stat.color }" />
      <span class="font-semibold tabular-nums text-ink">{{ stat.value }}</span>
      <span>{{ stat.label }}</span>
    </li>
  </ul>
</template>
