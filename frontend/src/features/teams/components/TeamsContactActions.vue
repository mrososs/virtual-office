<script setup lang="ts">
import { teamsIdentityOf, type Employee } from '@virtual-office/shared';
import { MessageSquare, Phone } from 'lucide-vue-next';
import { computed } from 'vue';

import { BaseButton } from '@/shared/components';
import { firstNameOf } from '@/shared/utils/names';
import { useCollaborationStore } from '@/stores/collaboration.store';
import { useRoomStore } from '@/stores/room.store';

import { useTeamsActions } from '../composables/useTeamsActions';

/**
 * Teams Chat and an audio Call for one teammate, straight from their work
 * email. Always offered (even when they look busy or offline here — the
 * caller decides); the Virtual Office status is never Teams presence.
 */
const props = defineProps<{ employee: Employee }>();

const collaborationStore = useCollaborationStore();
const roomStore = useRoomStore();
const { chatWith, callEmployee } = useTeamsActions();

const identity = computed(() => teamsIdentityOf(props.employee));
const first = computed(() => firstNameOf(props.employee.displayName));
const meetingRoom = computed(() => {
  const roomId = collaborationStore.liveRoomOf(props.employee.id);
  const room = roomId ? roomStore.byId(roomId) : undefined;
  return room?.type === 'MEETING' ? room : undefined;
});
</script>

<template>
  <section class="space-y-2">
    <p class="vo-section-label">Communication</p>
    <div class="flex flex-wrap gap-2">
      <BaseButton size="sm" :disabled="!identity" @click="chatWith(employee.id)"><MessageSquare :size="13" /> Teams Chat</BaseButton>
      <BaseButton size="sm" :variant="meetingRoom ? 'secondary' : 'primary'" :disabled="!identity" @click="callEmployee(employee.id)"><Phone :size="13" /> Call</BaseButton>
    </div>
    <p v-if="!identity" class="text-2xs leading-relaxed text-amber-200/80">Teams actions need a valid work email on {{ first }}'s employee record.</p>
    <template v-else>
      <p v-if="meetingRoom" class="text-2xs leading-relaxed text-muted">{{ first }} is in {{ meetingRoom.name }} in the office right now — a chat may be kinder than a call.</p>
      <p class="text-2xs leading-relaxed text-subtle">
        Opens Microsoft Teams as <span class="text-muted">{{ identity }}</span>. Teams asks before placing a call; nothing is sent for you.
        Status shown here is from the Virtual Office, not Teams presence.
      </p>
    </template>
  </section>
</template>
