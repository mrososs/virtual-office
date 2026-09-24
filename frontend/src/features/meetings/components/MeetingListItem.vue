<script setup lang="ts">
import type { Employee, Meeting } from '@virtual-office/shared';
import { MapPin } from 'lucide-vue-next';
import { computed } from 'vue';

import EmployeeAvatar from '@/features/employees/components/EmployeeAvatar.vue';
import { formatTimeRange } from '@/shared/utils/format';
import { useEmployeeStore } from '@/stores/employee.store';
import { useRoomStore } from '@/stores/room.store';

import MeetingStatusBadge from './MeetingStatusBadge.vue';

const props = defineProps<{ meeting: Meeting; selected: boolean }>();
const emit = defineEmits<{ select: [] }>();

const employeeStore = useEmployeeStore();
const roomStore = useRoomStore();

const room = computed(() => (props.meeting.roomId ? roomStore.byId(props.meeting.roomId) : undefined));
const people = computed(() =>
  props.meeting.attendees
    .map((attendee) => (attendee.employeeId ? employeeStore.byId(attendee.employeeId) : undefined))
    .filter((employee): employee is Employee => employee !== undefined),
);
const faded = computed(() => props.meeting.status === 'ENDED' || props.meeting.status === 'CANCELLED');
</script>

<template>
  <button
    type="button"
    class="w-full rounded-lg border p-3 text-left transition-colors"
    :class="[selected ? 'border-accent/40 bg-accent/[0.07]' : 'border-line/[0.07] bg-raised/50 hover:bg-hover/70', faded && 'opacity-60']"
    @click="emit('select')"
  >
    <div class="flex items-center gap-2">
      <MeetingStatusBadge :status="meeting.status" />
      <span class="ml-auto text-2xs tabular-nums text-subtle">{{ formatTimeRange(meeting.startAt, meeting.endAt) }}</span>
    </div>
    <p class="mt-2 text-[13px] font-medium text-ink">{{ meeting.title }}</p>
    <div class="mt-2 flex items-center gap-2 text-2xs text-subtle">
      <MapPin :size="11" />
      <span class="truncate">{{ room?.name ?? 'Online only' }}</span>
      <span class="ml-auto flex -space-x-1">
        <EmployeeAvatar v-for="person in people.slice(0, 5)" :key="person.id" :employee="person" size="xs" :show-presence="false" class="rounded-full ring-2 ring-surface" />
      </span>
    </div>
  </button>
</template>
