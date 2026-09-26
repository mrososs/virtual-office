<script setup lang="ts">
import type { MeetingResponseStatus, UUID } from '@virtual-office/shared';
import { Clock, Crosshair, Footprints, MapPin } from 'lucide-vue-next';
import { computed } from 'vue';

import EmployeeAvatar from '@/features/employees/components/EmployeeAvatar.vue';
import { useOfficeCommands } from '@/features/office/composables/useOfficeCommands';
import { BaseButton, DrawerShell } from '@/shared/components';
import { useNow } from '@/shared/composables';
import { initialsOf } from '@/shared/utils/names';
import { formatCountdown, formatDurationMinutes, formatRelativeTime, formatTimeRange } from '@/shared/utils/format';
import { useAuthStore } from '@/stores/auth.store';
import { useEmployeeStore } from '@/stores/employee.store';
import { useMeetingStore } from '@/stores/meeting.store';
import { useRoomStore } from '@/stores/room.store';
import { useUiStore } from '@/stores/ui.store';

import MeetingJoinButton from './MeetingJoinButton.vue';
import MeetingStatusBadge from './MeetingStatusBadge.vue';
import ProviderBadge from './ProviderBadge.vue';

const props = defineProps<{ meetingId: UUID }>();
const emit = defineEmits<{ close: [] }>();

const meetingStore = useMeetingStore();
const roomStore = useRoomStore();
const employeeStore = useEmployeeStore();
const uiStore = useUiStore();
const authStore = useAuthStore();
const { focusRoom, walkTo } = useOfficeCommands();
const now = useNow(1000);

const RESPONSE_LABEL: Record<MeetingResponseStatus, string> = {
  ACCEPTED: 'Accepted',
  TENTATIVE: 'Tentative',
  DECLINED: 'Declined',
  NONE_RESPONDED: 'No response',
  ORGANIZER: 'Organizer',
};

const meeting = computed(() => meetingStore.byId(props.meetingId));
const room = computed(() => (meeting.value?.roomId ? roomStore.byId(meeting.value.roomId) : undefined));
const inRoom = computed(() => new Set(room.value ? roomStore.occupantsOf(room.value.id) : []));

const timing = computed(() => {
  const current = meeting.value;
  if (!current) return '';
  if (current.status === 'LIVE') return `Started ${formatRelativeTime(current.startAt, now.value)}`;
  if (current.status === 'STARTING_SOON' || current.status === 'SCHEDULED') return `Starts ${formatCountdown(current.startAt, now.value)}`;
  return current.status === 'ENDED' ? 'Finished' : 'Cancelled';
});

const attendees = computed(() =>
  (meeting.value?.attendees ?? []).map((attendee) => ({
    attendee,
    employee: attendee.employeeId ? employeeStore.byId(attendee.employeeId) : undefined,
    present: attendee.employeeId ? inRoom.value.has(attendee.employeeId) : false,
    isMe: attendee.employeeId === authStore.currentEmployeeId,
  })),
);
const internalCount = computed(() => attendees.value.filter((row) => row.employee).length);

function walkToRoom(): void {
  if (room.value) walkTo({ kind: 'ROOM', roomId: room.value.id }, `Walking to ${room.value.name}`);
}
</script>

<template>
  <DrawerShell v-if="meeting" eyebrow="Meeting" @close="emit('close')">
    <template #header>
      <h2 class="text-[15px] font-semibold leading-snug text-ink">{{ meeting.title }}</h2>
      <div class="mt-2 flex flex-wrap items-center gap-1.5">
        <MeetingStatusBadge :status="meeting.status" />
        <ProviderBadge :provider="meeting.externalProvider" />
      </div>
    </template>

    <div class="space-y-5 px-4 py-4">
      <section class="space-y-2 text-[13px]">
        <div class="flex items-center gap-2.5">
          <Clock :size="14" class="shrink-0 text-subtle" />
          <span class="text-ink">{{ formatTimeRange(meeting.startAt, meeting.endAt) }}</span>
          <span class="text-subtle">· {{ formatDurationMinutes(meeting.startAt, meeting.endAt) }}</span>
        </div>
        <p class="pl-6 text-xs text-muted">{{ timing }}</p>
        <div v-if="room" class="flex items-center gap-2.5">
          <MapPin :size="14" class="shrink-0 text-subtle" />
          <button type="button" class="text-ink underline-offset-2 hover:underline" @click="uiStore.select({ kind: 'room', id: room.id })">{{ room.name }}</button>
          <span class="text-subtle">· {{ inRoom.size }}/{{ room.capacity }} in the room</span>
        </div>
      </section>

      <section class="space-y-2">
        <p class="vo-section-label">Attendees · {{ attendees.length }}<span v-if="internalCount < attendees.length" class="normal-case tracking-normal"> ({{ attendees.length - internalCount }} external)</span></p>
        <ul class="space-y-1">
          <li v-for="row in attendees" :key="row.attendee.externalEmail" class="flex items-center gap-2.5 rounded-lg px-1 py-1">
            <EmployeeAvatar v-if="row.employee" :employee="row.employee" size="sm" />
            <span v-else class="flex h-7 w-7 items-center justify-center rounded-full border border-dashed border-line/20 text-[10px] font-semibold text-muted">
              {{ initialsOf(row.attendee.displayName) }}
            </span>
            <span class="min-w-0 flex-1">
              <span class="block truncate text-[13px] text-ink">
                {{ row.attendee.displayName }}<span v-if="row.isMe" class="text-subtle"> (you)</span>
              </span>
              <span class="block truncate text-2xs text-subtle">{{ row.employee ? RESPONSE_LABEL[row.attendee.responseStatus] : `${row.attendee.externalEmail} · not in this office` }}</span>
            </span>
            <span v-if="row.present" class="rounded-full bg-emerald-500/12 px-2 py-0.5 text-[10px] font-semibold text-emerald-400">In room</span>
          </li>
        </ul>
      </section>
    </div>

    <template #footer>
      <div class="space-y-3">
        <div v-if="room" class="flex gap-2">
          <BaseButton size="sm" @click="focusRoom(room.id)"><Crosshair :size="13" /> Show room</BaseButton>
          <BaseButton size="sm" @click="walkToRoom"><Footprints :size="13" /> Walk there</BaseButton>
        </div>
        <MeetingJoinButton :meeting="meeting" />
      </div>
    </template>
  </DrawerShell>
</template>
