<script setup lang="ts">
import type { Employee } from '@virtual-office/shared';
import { computed } from 'vue';

import { formatRelativeTime } from '@/shared/utils/format';
import { useRoomStore } from '@/stores/room.store';

import EmployeeAvatar from './EmployeeAvatar.vue';
import EmployeeStatus from './EmployeeStatus.vue';

const props = defineProps<{ employee: Employee; selected: boolean; isMe: boolean; live: boolean }>();
const emit = defineEmits<{ select: [] }>();

const roomStore = useRoomStore();
const location = computed(() => {
  if (props.employee.presence.status === 'OFFLINE') return `Last seen ${formatRelativeTime(props.employee.presence.lastSeenAt)}`;
  const roomId = props.employee.room.roomId;
  return roomId ? (roomStore.byId(roomId)?.name ?? 'Office') : 'Hallway';
});
</script>

<template>
  <button
    type="button"
    class="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left transition-colors"
    :class="selected ? 'bg-accent/[0.08]' : 'hover:bg-hover/70'"
    @click="emit('select')"
  >
    <EmployeeAvatar :employee="employee" size="md" :live="live" />
    <span class="min-w-0 flex-1">
      <span class="flex items-center gap-1.5">
        <span class="truncate text-[13px] font-medium text-ink">{{ employee.displayName }}</span>
        <span v-if="isMe" class="rounded bg-accent/15 px-1 text-[9.5px] font-semibold text-accent">You</span>
      </span>
      <EmployeeStatus :employee="employee" class="max-w-full" />
    </span>
    <span class="flex w-[92px] shrink-0 flex-col items-end text-right">
      <span class="truncate text-2xs text-muted">{{ employee.jobTitle }}</span>
      <span class="w-full truncate text-2xs text-subtle">{{ location }}</span>
    </span>
  </button>
</template>
