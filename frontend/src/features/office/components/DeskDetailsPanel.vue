<script setup lang="ts">
import type { UUID } from '@virtual-office/shared';
import { Footprints, Monitor, UserRound } from 'lucide-vue-next';
import { computed } from 'vue';

import WorkItemCard from '@/features/azure-devops/components/WorkItemCard.vue';
import EmployeeAvatar from '@/features/employees/components/EmployeeAvatar.vue';
import EmployeeStatus from '@/features/employees/components/EmployeeStatus.vue';
import { useOfficeCommands } from '@/features/office/composables/useOfficeCommands';
import { BaseButton, DrawerShell, StatusBadge } from '@/shared/components';
import { deskCode } from '@/shared/utils/desk-code';
import { formatRelativeTime } from '@/shared/utils/format';
import { useEmployeeStore } from '@/stores/employee.store';
import { useRoomStore } from '@/stores/room.store';
import { useUiStore } from '@/stores/ui.store';
import { useWorkStore } from '@/stores/work.store';

const props = defineProps<{ deskId: UUID }>();
const emit = defineEmits<{ close: [] }>();

const roomStore = useRoomStore();
const employeeStore = useEmployeeStore();
const workStore = useWorkStore();
const uiStore = useUiStore();
const { walkTo } = useOfficeCommands();

const desk = computed(() => roomStore.deskById(props.deskId));
const owner = computed(() => (desk.value?.employeeId ? employeeStore.byId(desk.value.employeeId) : undefined));
const deskRoom = computed(() => (desk.value ? roomStore.roomAt(desk.value.position) : undefined));
const ownerRoom = computed(() => (owner.value?.room.roomId ? roomStore.byId(owner.value.room.roomId) : undefined));
const task = computed(() => workStore.workItem(owner.value?.activity.workItemId));

const state = computed(() => {
  const person = owner.value;
  if (!person) return { label: 'Free hot desk', color: '#22c55e', detail: 'Anyone can sit here today.' };
  const first = person.displayName.split(' ')[0];
  if (person.presence.status === 'OFFLINE') {
    return { label: 'Owner offline', color: '#6b7280', detail: `${first} was last seen ${formatRelativeTime(person.presence.lastSeenAt)}.` };
  }
  if (ownerRoom.value?.id && ownerRoom.value.id === deskRoom.value?.id) return { label: 'Owner nearby', color: '#10b981', detail: `${first} is in ${ownerRoom.value.name}.` };
  return { label: 'Owner away', color: '#f59e0b', detail: `${first} is in ${ownerRoom.value?.name ?? 'the hallway'} — the desk stays theirs.` };
});
</script>

<template>
  <DrawerShell v-if="desk" eyebrow="Desk" @close="emit('close')">
    <template #header>
      <div class="flex items-center gap-3">
        <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent/15 text-accent"><Monitor :size="18" /></span>
        <div class="min-w-0">
          <h2 class="text-[15px] font-semibold text-ink">Desk {{ deskCode(desk.id) }}</h2>
          <p class="text-xs text-muted">{{ deskRoom?.name ?? 'Office' }}</p>
        </div>
        <StatusBadge class="ml-auto" :color="state.color" :label="state.label" />
      </div>
    </template>

    <div class="space-y-5 px-4 py-4">
      <section class="space-y-2">
        <p class="vo-section-label">Assigned to</p>
        <button
          v-if="owner"
          type="button"
          class="flex w-full items-center gap-3 rounded-lg border border-line/[0.07] bg-raised/70 p-3 text-left transition-colors hover:bg-hover"
          @click="uiStore.select({ kind: 'employee', id: owner.id })"
        >
          <EmployeeAvatar :employee="owner" size="md" />
          <span class="min-w-0 flex-1">
            <span class="block truncate text-[13px] font-medium text-ink">{{ owner.displayName }}</span>
            <span class="block truncate text-2xs text-muted">{{ owner.jobTitle }}</span>
            <EmployeeStatus :employee="owner" class="mt-0.5" />
          </span>
        </button>
        <p v-else class="flex items-center gap-2 text-xs text-subtle"><UserRound :size="14" /> Unassigned</p>
        <p class="text-xs text-muted">{{ state.detail }}</p>
      </section>

      <section v-if="task" class="space-y-2">
        <p class="vo-section-label">Current task</p>
        <WorkItemCard :work-item="task" />
      </section>
    </div>

    <template #footer>
      <BaseButton size="sm" variant="primary" @click="walkTo({ kind: 'DESK', deskId: desk.id }, `Walking to desk ${deskCode(desk.id)}`)">
        <Footprints :size="13" /> Walk to desk
      </BaseButton>
    </template>
  </DrawerShell>
</template>
