<script setup lang="ts">
import type { Meeting, MeetingStatus } from '@virtual-office/shared';
import { computed } from 'vue';

import OfficeSidePanel from '@/features/office/components/OfficeSidePanel.vue';
import { useOfficeCommands } from '@/features/office/composables/useOfficeCommands';
import { useMeetingStore } from '@/stores/meeting.store';
import { useUiStore } from '@/stores/ui.store';

import MeetingListItem from './MeetingListItem.vue';

const meetingStore = useMeetingStore();
const uiStore = useUiStore();
const { focusRoom } = useOfficeCommands();

const ORDER: Record<MeetingStatus, number> = { LIVE: 0, STARTING_SOON: 1, SCHEDULED: 2, ENDED: 3, CANCELLED: 4 };

const groups = computed(() => {
  const sorted = [...meetingStore.all].sort((a, b) => ORDER[a.status] - ORDER[b.status] || a.startAt.localeCompare(b.startAt));
  return [
    { key: 'now', label: 'Happening now', items: sorted.filter((meeting) => meeting.status === 'LIVE' || meeting.status === 'STARTING_SOON') },
    { key: 'later', label: 'Later today', items: sorted.filter((meeting) => meeting.status === 'SCHEDULED') },
    { key: 'done', label: 'Earlier', items: sorted.filter((meeting) => meeting.status === 'ENDED' || meeting.status === 'CANCELLED') },
  ].filter((group) => group.items.length > 0);
});

function open(meeting: Meeting): void {
  uiStore.select({ kind: 'meeting', id: meeting.id });
  if (meeting.roomId) void focusRoom(meeting.roomId);
}
</script>

<template>
  <OfficeSidePanel title="Meetings" subtitle="Today · synced from Microsoft 365 (demo data)">
    <div class="space-y-5 p-3">
      <section v-for="group in groups" :key="group.key" class="space-y-2">
        <p class="vo-section-label px-1">{{ group.label }}</p>
        <MeetingListItem
          v-for="meeting in group.items"
          :key="meeting.id"
          :meeting="meeting"
          :selected="uiStore.selection?.kind === 'meeting' && uiStore.selection.id === meeting.id"
          @select="open(meeting)"
        />
      </section>
      <p v-if="groups.length === 0" class="px-1 py-6 text-center text-xs text-subtle">No meetings today.</p>
    </div>
  </OfficeSidePanel>
</template>
