<script setup lang="ts">
import { employeeTitleWithTeam, type ActivitySource, type UUID } from '@virtual-office/shared';
import { Crosshair, Footprints, MapPin, Monitor, ShieldCheck, Video } from 'lucide-vue-next';
import { computed } from 'vue';

import BuildCard from '@/features/azure-devops/components/BuildCard.vue';
import PullRequestCard from '@/features/azure-devops/components/PullRequestCard.vue';
import WorkItemCard from '@/features/azure-devops/components/WorkItemCard.vue';
import { ACTIVITY_ICONS } from '@/features/employees/activity-icons';
import MeetingStatusBadge from '@/features/meetings/components/MeetingStatusBadge.vue';
import { useOfficeCommands } from '@/features/office/composables/useOfficeCommands';
import { useStatusLookups } from '@/features/office/composables/useStatusLookups';
import { BaseButton, DrawerShell } from '@/shared/components';
import { ACTIVITY_META, PRESENCE_META } from '@/shared/constants';
import { deskCode } from '@/shared/utils/desk-code';
import { formatRelativeTime, formatTimeRange } from '@/shared/utils/format';
import { useAuthStore } from '@/stores/auth.store';
import { useEmployeeStore } from '@/stores/employee.store';
import { useMeetingStore } from '@/stores/meeting.store';
import { useRoomStore } from '@/stores/room.store';
import { useUiStore } from '@/stores/ui.store';
import { useWorkStore } from '@/stores/work.store';

import EmployeeAvatar from './EmployeeAvatar.vue';

const props = defineProps<{ employeeId: UUID }>();
const emit = defineEmits<{ close: [] }>();

const employeeStore = useEmployeeStore();
const roomStore = useRoomStore();
const workStore = useWorkStore();
const meetingStore = useMeetingStore();
const uiStore = useUiStore();
const authStore = useAuthStore();
const { statusLineOf } = useStatusLookups();
const { focusEmployee, walkTo } = useOfficeCommands();

const SOURCE_LABEL: Record<ActivitySource, string> = {
  AZURE_DEVOPS: 'via Azure DevOps',
  MICROSOFT_TEAMS: 'via Microsoft Teams calendar',
  MANUAL: 'set by them',
  SYSTEM: 'default',
};

const employee = computed(() => employeeStore.byId(props.employeeId));
const isMe = computed(() => props.employeeId === authStore.currentEmployeeId);
const offline = computed(() => employee.value?.presence.status === 'OFFLINE');
const isLive = computed(() => uiStore.liveEmployeeIds.includes(props.employeeId));
const presenceMeta = computed(() => (employee.value ? PRESENCE_META[employee.value.presence.status] : PRESENCE_META.OFFLINE));
const activityMeta = computed(() => (employee.value ? ACTIVITY_META[employee.value.activity.type] : ACTIVITY_META.UNKNOWN));
const activityIcon = computed(() => ACTIVITY_ICONS[employee.value?.activity.type ?? 'UNKNOWN']);

const room = computed(() => (employee.value?.room.roomId ? roomStore.byId(employee.value.room.roomId) : undefined));
const desk = computed(() => (employee.value?.assignedDesk ? roomStore.deskById(employee.value.assignedDesk.deskId) : undefined));
const deskRoom = computed(() => (desk.value ? roomStore.roomAt(desk.value.position) : undefined));

const workItem = computed(() => {
  const activityItem = workStore.workItem(employee.value?.activity.workItemId);
  if (activityItem) return activityItem;
  return Object.values(workStore.workItemsById).find((item) => item.assignedEmployeeId === props.employeeId && item.state !== 'CLOSED');
});
const pullRequest = computed(() => workStore.pullRequest(employee.value?.activity.pullRequestId) ?? workStore.pullRequestsAuthoredBy(props.employeeId)[0]);
const build = computed(() => {
  const activityBuild = workStore.build(employee.value?.activity.buildId);
  if (activityBuild) return activityBuild;
  return Object.values(workStore.buildsById).find((item) => item.triggeredByEmployeeId === props.employeeId && item.status === 'RUNNING');
});
const meeting = computed(() => (employee.value?.meeting ? meetingStore.byId(employee.value.meeting.meetingId) : undefined));

const locationLabel = computed(() => {
  if (offline.value) return 'Not in the office';
  return room.value?.name ?? 'Hallway';
});

function walkToEmployee(): void {
  if (employee.value) walkTo({ kind: 'EMPLOYEE', employeeId: employee.value.id }, `Walking to ${employee.value.displayName.split(' ')[0]}`);
}
</script>

<template>
  <DrawerShell v-if="employee" eyebrow="Teammate" @close="emit('close')">
    <template #header>
      <div class="flex items-center gap-3">
        <EmployeeAvatar :employee="employee" size="lg" :live="isLive" />
        <div class="min-w-0">
          <h2 class="truncate text-[15px] font-semibold text-ink">
            {{ employee.displayName }}
            <span v-if="isMe" class="ml-1 rounded bg-accent/15 px-1.5 py-0.5 align-middle text-[10px] font-semibold text-accent">You</span>
          </h2>
          <p class="truncate text-xs text-muted" :title="employee.discipline ?? undefined">{{ employeeTitleWithTeam(employee) }}</p>
        </div>
      </div>
    </template>

    <div class="space-y-5 px-4 py-4">
      <section class="grid grid-cols-2 gap-2">
        <div class="rounded-lg border border-line/[0.07] bg-raised/60 px-3 py-2.5">
          <p class="vo-section-label mb-1">Presence</p>
          <p class="flex items-center gap-1.5 text-[13px] font-medium" :style="{ color: presenceMeta.color }">
            <span class="h-2 w-2 rounded-full" :style="{ backgroundColor: presenceMeta.color }" />
            {{ presenceMeta.label }}
          </p>
          <p class="mt-0.5 text-2xs text-subtle">
            {{ offline ? `Last seen ${formatRelativeTime(employee.presence.lastSeenAt)}` : isLive ? 'Connected live' : 'In the office app' }}
          </p>
        </div>
        <div class="rounded-lg border border-line/[0.07] bg-raised/60 px-3 py-2.5">
          <p class="vo-section-label mb-1">Activity</p>
          <p class="flex items-center gap-1.5 text-[13px] font-medium" :style="{ color: offline ? PRESENCE_META.OFFLINE.color : activityMeta.color }">
            <component :is="activityIcon" :size="13" />
            {{ offline ? 'Offline' : activityMeta.label }}
          </p>
          <p class="mt-0.5 truncate text-2xs text-subtle">{{ offline ? 'No current signal' : SOURCE_LABEL[employee.activity.source] }}</p>
        </div>
      </section>

      <p v-if="!offline" class="-mt-2 text-[13px] leading-relaxed text-muted">{{ statusLineOf(employee) }}</p>

      <section class="space-y-2">
        <p class="vo-section-label">Where</p>
        <div class="flex items-center gap-2.5 text-[13px]">
          <MapPin :size="14" class="shrink-0 text-subtle" />
          <span class="text-ink">{{ locationLabel }}</span>
        </div>
        <div v-if="desk" class="flex items-center gap-2.5 text-[13px]">
          <Monitor :size="14" class="shrink-0 text-subtle" />
          <span class="text-ink">Desk {{ deskCode(desk.id) }}</span>
          <span class="text-subtle">· {{ deskRoom?.name ?? 'Office' }}</span>
        </div>
      </section>

      <section v-if="meeting" class="space-y-2">
        <p class="vo-section-label">Meeting</p>
        <button
          type="button"
          class="flex w-full items-center gap-3 rounded-lg border border-line/[0.07] bg-raised/70 p-3 text-left transition-colors hover:bg-hover"
          @click="uiStore.select({ kind: 'meeting', id: meeting.id })"
        >
          <span class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-500/15 text-blue-400"><Video :size="15" /></span>
          <span class="min-w-0 flex-1">
            <span class="block truncate text-[13px] font-medium text-ink">{{ meeting.title }}</span>
            <span class="block text-2xs text-subtle">{{ formatTimeRange(meeting.startAt, meeting.endAt) }}</span>
          </span>
          <MeetingStatusBadge :status="meeting.status" />
        </button>
      </section>

      <section v-if="workItem || pullRequest || build" class="space-y-2">
        <p class="vo-section-label">Azure DevOps</p>
        <WorkItemCard v-if="workItem" :work-item="workItem" />
        <PullRequestCard v-if="pullRequest" :pull-request="pullRequest" />
        <BuildCard v-if="build" :build="build" />
      </section>

      <p class="flex gap-2 rounded-lg bg-raised/50 px-3 py-2.5 text-2xs leading-relaxed text-subtle">
        <ShieldCheck :size="13" class="mt-px shrink-0" />
        Activity reflects work items, pull requests and calendars — never keyboard, screen or device monitoring. Presence only means the office app is open.
      </p>
    </div>

    <template v-if="!offline" #footer>
      <div class="flex gap-2">
        <BaseButton size="sm" @click="focusEmployee(employee.id, { select: false })"><Crosshair :size="13" /> Show on map</BaseButton>
        <BaseButton v-if="!isMe" size="sm" variant="primary" @click="walkToEmployee"><Footprints :size="13" /> Walk to {{ employee.displayName.split(' ')[0] }}</BaseButton>
      </div>
    </template>
  </DrawerShell>
</template>
