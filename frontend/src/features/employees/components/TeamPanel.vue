<script setup lang="ts">
import type { Employee } from '@virtual-office/shared';
import { Search } from 'lucide-vue-next';
import { computed, shallowRef } from 'vue';

import OfficeSidePanel from '@/features/office/components/OfficeSidePanel.vue';
import { useOfficeCommands } from '@/features/office/composables/useOfficeCommands';
import { useAuthStore } from '@/stores/auth.store';
import { useEmployeeStore } from '@/stores/employee.store';
import { useOfficeStore } from '@/stores/office.store';
import { useUiStore } from '@/stores/ui.store';

import TeamMemberRow from './TeamMemberRow.vue';

type Filter = 'all' | 'online' | 'offline';

const employeeStore = useEmployeeStore();
const officeStore = useOfficeStore();
const uiStore = useUiStore();
const authStore = useAuthStore();
const { focusEmployee } = useOfficeCommands();

const filter = shallowRef<Filter>('all');
const query = shallowRef('');

const counts = computed(() => ({
  all: employeeStore.all.length,
  online: employeeStore.onlineCount,
  offline: employeeStore.all.length - employeeStore.onlineCount,
}));

const members = computed<Employee[]>(() => {
  const term = query.value.trim().toLowerCase();
  return employeeStore.all
    .filter((employee) => {
      const online = employee.presence.status !== 'OFFLINE';
      if (filter.value === 'online' && !online) return false;
      if (filter.value === 'offline' && online) return false;
      if (!term) return true;
      return [employee.displayName, employee.jobTitle ?? '', officeStore.teamName(employee.teamId) ?? ''].some((field) => field.toLowerCase().includes(term));
    })
    .sort((a, b) => Number(a.presence.status === 'OFFLINE') - Number(b.presence.status === 'OFFLINE') || a.displayName.localeCompare(b.displayName));
});

const filters: Array<{ key: Filter; label: string }> = [
  { key: 'all', label: 'All' },
  { key: 'online', label: 'Online' },
  { key: 'offline', label: 'Offline' },
];
</script>

<template>
  <OfficeSidePanel title="Team" :subtitle="`${counts.online} of ${counts.all} people in the office`">
    <template #toolbar>
      <div class="mt-3 space-y-2">
        <label class="flex h-8 items-center gap-2 rounded-lg border border-line/[0.08] bg-raised/70 px-2.5 text-muted focus-within:border-accent/50">
          <Search :size="13" />
          <input v-model="query" type="search" name="team-filter" autocomplete="off" placeholder="Filter by name, role or team" class="min-w-0 flex-1 bg-transparent text-[13px] text-ink placeholder:text-subtle focus:outline-none">
        </label>
        <div class="flex rounded-lg bg-raised/70 p-0.5" role="tablist">
          <button
            v-for="option in filters"
            :key="option.key"
            type="button"
            role="tab"
            :aria-selected="filter === option.key"
            class="flex-1 rounded-md py-1 text-2xs font-semibold transition-colors"
            :class="filter === option.key ? 'bg-hover text-ink shadow-sm' : 'text-subtle hover:text-muted'"
            @click="filter = option.key"
          >
            {{ option.label }} <span class="tabular-nums text-subtle">{{ counts[option.key] }}</span>
          </button>
        </div>
      </div>
    </template>

    <ul class="p-1.5">
      <li v-for="employee in members" :key="employee.id">
        <TeamMemberRow
          :employee="employee"
          :selected="uiStore.selection?.kind === 'employee' && uiStore.selection.id === employee.id"
          :is-me="employee.id === authStore.currentEmployeeId"
          :live="uiStore.liveEmployeeIds.includes(employee.id)"
          @select="focusEmployee(employee.id)"
        />
      </li>
    </ul>
    <p v-if="members.length === 0" class="px-4 py-6 text-center text-xs text-subtle">Nobody matches this filter.</p>
  </OfficeSidePanel>
</template>
