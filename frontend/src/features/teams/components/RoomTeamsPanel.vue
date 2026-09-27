<script setup lang="ts">
import { teamsIdentityOf, type UUID } from '@virtual-office/shared';
import { CalendarPlus, ExternalLink, Link2, MessageSquare, Phone, X } from 'lucide-vue-next';
import { computed, shallowRef, watch } from 'vue';

import EmployeeAvatar from '@/features/employees/components/EmployeeAvatar.vue';
import { BaseButton } from '@/shared/components';
import { formatRelativeTime } from '@/shared/utils/format';
import { firstNameOf } from '@/shared/utils/names';
import { useAuthStore } from '@/stores/auth.store';
import { useCollaborationStore } from '@/stores/collaboration.store';
import { useEmployeeStore } from '@/stores/employee.store';
import { useOfficeStore } from '@/stores/office.store';
import { useRoomStore } from '@/stores/room.store';

import { useTeamsActions } from '../composables/useTeamsActions';

/**
 * Teams for a room, from its live (server) occupancy:
 *   collaboration rooms → a quick group audio call or group chat with whoever is here
 *   meeting rooms       → the room's shared Teams meeting: join it, attach one, or schedule one in Teams
 * Nothing starts by walking in; every action is a button press.
 */
const props = defineProps<{ roomId: UUID }>();

const collaborationStore = useCollaborationStore();
const employeeStore = useEmployeeStore();
const roomStore = useRoomStore();
const officeStore = useOfficeStore();
const authStore = useAuthStore();
const teams = useTeamsActions();

const room = computed(() => roomStore.byId(props.roomId));
const kind = computed(() => (room.value?.type === 'MEETING' ? 'meeting' : 'collaboration'));
const live = computed(() => officeStore.realtimeStatus === 'connected' && collaborationStore.synced);
const occupantIds = computed(() => collaborationStore.occupantsOf(props.roomId));
const inside = computed(() => !!authStore.currentEmployeeId && occupantIds.value.includes(authStore.currentEmployeeId));
const people = computed(() =>
  occupantIds.value
    .map((id) => employeeStore.byId(id))
    .filter((employee): employee is NonNullable<typeof employee> => !!employee)
    .map((employee) => ({ employee, isMe: employee.id === authStore.currentEmployeeId, reachable: !!teamsIdentityOf(employee) })),
);
const others = computed(() => people.value.filter((person) => !person.isMe));
const reachableOthers = computed(() => others.value.filter((person) => person.reachable));
const unreachable = computed(() => others.value.filter((person) => !person.reachable).map((person) => firstNameOf(person.employee.displayName)));

const session = computed(() => collaborationStore.sessionOf(props.roomId));
const sessionOwner = computed(() => (session.value ? employeeStore.byId(session.value.createdBy) : undefined));
const canEnd = computed(() => !!session.value && (inside.value || session.value.createdBy === authStore.currentEmployeeId));

const adding = shallowRef(false);
const title = shallowRef('');
const link = shallowRef('');
watch(
  () => props.roomId,
  () => {
    adding.value = false;
    title.value = '';
    link.value = '';
  },
);
watch(session, (next) => {
  if (next) adding.value = false;
});

function attach(): void {
  teams.attachMeeting(props.roomId, title.value, link.value);
}
</script>

<template>
  <section class="space-y-2.5">
    <p class="vo-section-label">{{ kind === 'meeting' ? 'Teams meeting' : 'Teams · quick collaboration' }}</p>

    <p v-if="!live" class="text-xs text-subtle">Needs a live connection to the office. It reconnects on its own.</p>

    <!-- Collaboration room -->
    <template v-else-if="kind === 'collaboration'">
      <ul v-if="people.length" class="space-y-1">
        <li v-for="person in people" :key="person.employee.id" class="flex items-center gap-2 text-[13px] text-ink">
          <EmployeeAvatar :employee="person.employee" size="xs" :show-presence="false" />
          <span class="truncate">{{ person.employee.displayName }}</span>
          <span v-if="person.isMe" class="text-2xs font-semibold text-accent">You</span>
        </li>
      </ul>
      <p v-if="inside && others.length === 0" class="text-xs text-muted">You're the only person here. Waiting for teammates…</p>
      <p v-else-if="!inside && people.length === 0" class="text-xs text-subtle">Nobody is here right now.</p>
      <p v-else-if="!inside" class="text-xs text-muted">Walk in to start a Teams call or chat with the people here.</p>
      <template v-if="inside && reachableOthers.length > 0">
        <p class="text-xs text-muted">{{ people.length }} people here.</p>
        <div class="flex flex-wrap gap-2">
          <BaseButton size="sm" variant="primary" @click="teams.startGroupCall(roomId)"><Phone :size="13" /> Start Teams Call</BaseButton>
          <BaseButton size="sm" @click="teams.openGroupChat(roomId)"><MessageSquare :size="13" /> Open Group Chat</BaseButton>
        </div>
        <p class="text-2xs leading-relaxed text-subtle">An audio call or chat in Microsoft Teams with the people in this room now. Teams asks before calling; nothing starts by itself.</p>
      </template>
      <p v-if="inside && unreachable.length" class="text-2xs text-amber-200/80">Not included (no work email on file): {{ unreachable.join(', ') }}.</p>
    </template>

    <!-- Meeting room -->
    <template v-else>
      <template v-if="session">
        <div class="rounded-lg border border-line/[0.07] bg-raised/70 p-3">
          <p class="text-[13px] font-medium text-ink">{{ session.title }}</p>
          <p class="mt-0.5 text-2xs text-subtle">Added by {{ sessionOwner ? firstNameOf(sessionOwner.displayName) : 'a teammate' }} · {{ formatRelativeTime(session.updatedAt) }}</p>
          <p v-if="people.length" class="mt-2 text-2xs text-muted">In the room: {{ people.map((person) => (person.isMe ? 'You' : firstNameOf(person.employee.displayName))).join(', ') }}</p>
        </div>
        <div class="flex flex-wrap items-center gap-2">
          <BaseButton size="sm" variant="primary" @click="teams.joinMeeting(roomId)"><ExternalLink :size="13" /> Join Teams Meeting</BaseButton>
          <BaseButton v-if="canEnd" size="sm" variant="ghost" @click="teams.endMeeting(roomId)"><X :size="13" /> End room meeting</BaseButton>
        </div>
        <p class="text-2xs leading-relaxed text-subtle">Opens the meeting in Microsoft Teams. The office never joins for you.</p>
      </template>

      <template v-else>
        <p class="text-xs text-muted">No Teams meeting is assigned to this room.</p>
        <p v-if="!inside" class="text-2xs text-subtle">Walk into the room to attach or schedule a Teams meeting.</p>
        <template v-else>
          <div v-if="!adding" class="flex flex-wrap gap-2">
            <BaseButton size="sm" variant="primary" @click="adding = true"><Link2 :size="13" /> Add Teams Meeting Link</BaseButton>
            <BaseButton size="sm" @click="teams.scheduleMeeting(roomId, title)"><CalendarPlus :size="13" /> Schedule in Teams</BaseButton>
          </div>
          <form v-else class="space-y-1.5" @submit.prevent="attach">
            <label :for="`meeting-title-${roomId}`" class="block text-xs font-medium text-ink">Meeting title</label>
            <input :id="`meeting-title-${roomId}`" v-model="title" type="text" maxlength="80" placeholder="Sprint Planning" class="h-8 w-full rounded-lg border border-line/10 bg-raised px-2.5 text-[13px] text-ink placeholder:text-subtle focus:border-accent/60">
            <label :for="`meeting-link-${roomId}`" class="block text-xs font-medium text-ink">Teams meeting link</label>
            <input
              :id="`meeting-link-${roomId}`"
              v-model="link"
              type="url"
              maxlength="512"
              autocomplete="off"
              spellcheck="false"
              placeholder="https://teams.microsoft.com/meet/…"
              class="h-8 w-full rounded-lg border border-line/10 bg-raised px-2.5 text-[13px] text-ink placeholder:text-subtle focus:border-accent/60"
              :aria-invalid="!!collaborationStore.meetingError"
            >
            <p v-if="collaborationStore.meetingError" class="text-2xs text-red-300" role="alert">{{ collaborationStore.meetingError }}</p>
            <div class="flex gap-2">
              <BaseButton type="submit" size="sm" variant="primary" :disabled="!link.trim() || !title.trim()">Start room meeting</BaseButton>
              <BaseButton size="sm" variant="ghost" @click="adding = false">Cancel</BaseButton>
            </div>
          </form>
          <p class="text-2xs leading-relaxed text-subtle">
            Schedule in Teams opens Teams' own new-meeting form with the people here. Teams can't send the new meeting's link back to the office — copy its Join link from Teams and add it here to share it in this room.
          </p>
        </template>
      </template>
    </template>
  </section>
</template>
