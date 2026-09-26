<script setup lang="ts">
import { storeToRefs } from 'pinia';
import { computed } from 'vue';

import { COMPANY_BRANDING } from '@/core/config/branding';
import EmployeeAvatar from '@/features/employees/components/EmployeeAvatar.vue';
import EmployeeSearch from '@/features/employees/components/EmployeeSearch.vue';
import AzureAttentionChip from '@/features/integrations/components/AzureAttentionChip.vue';
import NotificationsMenu from '@/features/notifications/components/NotificationsMenu.vue';
import { CompanyBrand } from '@/shared/components';
import { useEmployeeStore } from '@/stores/employee.store';
import { useOfficeStore } from '@/stores/office.store';
import { useWorkStore } from '@/stores/work.store';

import ProfileMenu from './ProfileMenu.vue';

const officeStore = useOfficeStore();
const employeeStore = useEmployeeStore();
const workStore = useWorkStore();
const { floor } = storeToRefs(officeStore);

const online = computed(() => employeeStore.all.filter((employee) => employee.presence.status !== 'OFFLINE'));
const avatarStack = computed(() => online.value.slice(0, 4));
const sprintLabel = computed(() => {
  const day = workStore.sprintDay;
  return workStore.sprint && day ? `${workStore.sprint.name} · Day ${day.day} of ${day.length}` : null;
});
</script>

<template>
  <header class="relative z-30 flex h-12 shrink-0 items-center gap-3 border-b border-line/[0.06] bg-surface/80 px-3 backdrop-blur-md">
    <CompanyBrand class="pr-1" :subtitle="floor ? `${COMPANY_BRANDING.productName} · ${floor.name}` : undefined" />

    <div class="hidden h-5 w-px bg-line/10 md:block" />

    <div v-if="online.length > 0" class="hidden items-center gap-2 md:flex" :title="`${online.length} people online`">
      <div class="flex -space-x-1.5">
        <EmployeeAvatar v-for="employee in avatarStack" :key="employee.id" :employee="employee" size="xs" :show-presence="false" class="ring-2 ring-surface rounded-full" />
      </div>
      <span class="inline-flex items-center gap-1.5 text-xs font-medium text-muted">
        <span class="h-1.5 w-1.5 rounded-full bg-emerald-400" />
        {{ online.length }} online
      </span>
    </div>

    <span v-if="sprintLabel" class="hidden rounded-md border border-line/[0.08] bg-raised px-2 py-1 text-2xs font-medium text-muted lg:inline-flex">
      {{ sprintLabel }}
    </span>

    <div class="ml-auto flex items-center gap-1.5">
      <AzureAttentionChip />
      <EmployeeSearch />
      <NotificationsMenu />
      <ProfileMenu />
    </div>
  </header>
</template>
