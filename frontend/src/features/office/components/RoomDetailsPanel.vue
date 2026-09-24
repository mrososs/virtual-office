<script setup lang="ts">
import type { Employee, UUID } from '@virtual-office/shared';
import { Crosshair, Footprints, Users, Video } from 'lucide-vue-next';
import { computed } from 'vue';

import { ROOM_ICONS } from '@/features/employees/activity-icons';
import EmployeeAvatar from '@/features/employees/components/EmployeeAvatar.vue';
import EmployeeStatus from '@/features/employees/components/EmployeeStatus.vue';
import MeetingStatusBadge from '@/features/meetings/components/MeetingStatusBadge.vue';
import { useOfficeCommands } from '@/features/office/composables/useOfficeCommands';
import { BaseButton, DrawerShell, StatusBadge } from '@/shared/components';
import { ROOM_TYPE_META } from '@/shared/constants';
import { formatTimeRange } from '@/shared/utils/format';
import { useEmployeeStore } from '@/stores/employee.store';
import { useMeetingStore } from '@/stores/meeting.store';
import { useRoomStore } from '@/stores/room.store';
import { useUiStore } from '@/stores/ui.store';

const props = defineProps<{ roomId: UUID }>();
const emit = defineEmits<{ close: [] }>();

const roomStore = useRoomStore();
const employeeStore = useEmployeeStore();
const meetingStore = useMeetingStore();
const uiStore = useUiStore();
const { focusRoom, walkTo, focusEmployee } = useOfficeCommands();

const room = computed(() => roomStore.byId(props.roomId));
const meta = computed(() => (room.value ? ROOM_TYPE_META[room.value.type] : ROOM_TYPE_META.GENERAL));
const icon = computed(() => ROOM_ICONS[room.value?.type ?? 'GENERAL']);
const occupants = computed(() =>
  roomStore
    .occupantsOf(props.roomId)
    .map((id) => employeeStore.byId(id))
    .filter((employee): employee is Employee => employee !== undefined),
);
const meeting = computed(() => meetingStore.currentForRoom(props.roomId));
const nextMeeting = computed(() => meetingStore.all.find((candidate) => candidate.roomId === props.roomId && candidate.status === 'SCHEDULED'));
const shownMeeting = computed(() => meeting.value ?? nextMeeting.value);
const fill = computed(() => (room.value ? Math.min(1, occupants.value.length / room.value.capacity) : 0));

const availability = computed(() => {
  if (!room.value) return { label: '', color: '#94a3b8' };
  if (meeting.value?.status === 'LIVE') return { label: 'In use', color: '#ef4444' };
  if (meeting.value?.status === 'STARTING_SOON') return { label: 'Reserved soon', color: '#f59e0b' };
  if (occupants.value.length >= room.value.capacity) return { label: 'Full', color: '#ef4444' };
  return occupants.value.length > 0 ? { label: 'Occupied', color: '#3b82f6' } : { label: 'Available', color: '#22c55e' };
});
</script>

<template>
  <DrawerShell v-if="room" eyebrow="Room" @close="emit('close')">
    <template #header>
      <div class="flex items-center gap-3">
        <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl" :style="{ backgroundColor: `${meta.color}22`, color: meta.color }">
          <component :is="icon" :size="18" />
        </span>
        <div class="min-w-0">
          <h2 class="truncate text-[15px] font-semibold text-ink">{{ room.name }}</h2>
          <p class="text-xs text-muted">{{ meta.label }}</p>
        </div>
        <StatusBadge class="ml-auto" :color="availability.color" :label="availability.label" />
      </div>
    </template>

    <div class="space-y-5 px-4 py-4">
      <section>
        <div class="mb-1.5 flex items-center justify-between text-xs">
          <span class="inline-flex items-center gap-1.5 text-muted"><Users :size="13" /> Occupancy</span>
          <span class="font-semibold tabular-nums text-ink">{{ occupants.length }} / {{ room.capacity }}</span>
        </div>
        <div class="h-1.5 overflow-hidden rounded-full bg-raised">
          <div class="h-full rounded-full transition-[width] duration-500" :style="{ width: `${fill * 100}%`, backgroundColor: meta.color }" />
        </div>
      </section>

      <section v-if="shownMeeting" class="space-y-2">
        <p class="vo-section-label">{{ meeting ? 'Current meeting' : 'Next meeting' }}</p>
        <button
          type="button"
          class="flex w-full items-center gap-3 rounded-lg border border-line/[0.07] bg-raised/70 p-3 text-left transition-colors hover:bg-hover"
          @click="uiStore.select({ kind: 'meeting', id: shownMeeting.id })"
        >
          <span class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-500/15 text-blue-400"><Video :size="15" /></span>
          <span class="min-w-0 flex-1">
            <span class="block truncate text-[13px] font-medium text-ink">{{ shownMeeting.title }}</span>
            <span class="block text-2xs text-subtle">{{ formatTimeRange(shownMeeting.startAt, shownMeeting.endAt) }}</span>
          </span>
          <MeetingStatusBadge :status="shownMeeting.status" />
        </button>
      </section>

      <section class="space-y-1.5">
        <p class="vo-section-label">People here</p>
        <ul v-if="occupants.length" class="space-y-0.5">
          <li v-for="person in occupants" :key="person.id">
            <button type="button" class="flex w-full items-center gap-2.5 rounded-lg px-1.5 py-1.5 text-left transition-colors hover:bg-hover/70" @click="focusEmployee(person.id)">
              <EmployeeAvatar :employee="person" size="sm" />
              <span class="min-w-0 flex-1">
                <span class="block truncate text-[13px] text-ink">{{ person.displayName }}</span>
                <EmployeeStatus :employee="person" />
              </span>
            </button>
          </li>
        </ul>
        <p v-else class="text-xs text-subtle">Nobody is here right now.</p>
      </section>
    </div>

    <template #footer>
      <div class="flex gap-2">
        <BaseButton size="sm" @click="focusRoom(room.id)"><Crosshair :size="13" /> Show on map</BaseButton>
        <BaseButton size="sm" variant="primary" @click="walkTo({ kind: 'ROOM', roomId: room.id }, `Walking to ${room.name}`)"><Footprints :size="13" /> Walk here</BaseButton>
      </div>
    </template>
  </DrawerShell>
</template>
