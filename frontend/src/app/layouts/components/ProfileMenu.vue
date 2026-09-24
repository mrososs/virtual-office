<script setup lang="ts">
import type { UUID } from '@virtual-office/shared';
import { ExternalLink } from 'lucide-vue-next';
import { computed, shallowRef, useTemplateRef } from 'vue';

import { runtimeEnv } from '@/core/config';
import EmployeeAvatar from '@/features/employees/components/EmployeeAvatar.vue';
import { useClickOutside } from '@/shared/composables';
import { useAuthStore } from '@/stores/auth.store';
import { useEmployeeStore } from '@/stores/employee.store';
import { useOfficeStore } from '@/stores/office.store';

const authStore = useAuthStore();
const employeeStore = useEmployeeStore();
const officeStore = useOfficeStore();

const open = shallowRef(false);
const root = useTemplateRef<HTMLElement>('root');
useClickOutside(root, open, () => (open.value = false));

const me = computed(() => (authStore.currentEmployeeId ? employeeStore.byId(authStore.currentEmployeeId) : undefined));
const others = computed(() => employeeStore.all.filter((employee) => employee.id !== authStore.currentEmployeeId && employee.presence.status === 'ONLINE'));

async function openAs(employeeId: UUID): Promise<void> {
  const { demoSessionService } = await import('@/demo/demo-session.service');
  window.open(demoSessionService.urlForIdentity(employeeId), '_blank', 'noopener');
  open.value = false;
}
</script>

<template>
  <div ref="root" class="relative">
    <button
      type="button"
      class="flex h-8 items-center gap-2 rounded-lg pl-1 pr-1.5 transition-colors hover:bg-hover"
      :aria-expanded="open"
      aria-label="Account"
      @click="open = !open"
    >
      <EmployeeAvatar v-if="me" :employee="me" size="sm" />
    </button>

    <Transition
      enter-active-class="transition duration-150 ease-out"
      enter-from-class="opacity-0 -translate-y-1"
      leave-active-class="transition duration-100 ease-in"
      leave-to-class="opacity-0 -translate-y-1"
    >
      <div v-if="open && me" class="vo-panel absolute right-0 top-10 z-40 w-[280px] shadow-pop">
        <div class="flex items-center gap-3 border-b border-line/[0.06] p-3">
          <EmployeeAvatar :employee="me" size="md" />
          <div class="min-w-0">
            <p class="truncate text-[13px] font-semibold">{{ me.displayName }}</p>
            <p class="truncate text-xs text-muted">{{ me.jobTitle }} · {{ officeStore.teamName(me.teamId) }}</p>
          </div>
        </div>
        <div v-if="runtimeEnv.demoMode" class="p-2">
          <p class="px-1.5 pb-1.5 pt-1 text-2xs leading-relaxed text-subtle">
            Demo session — no password. To test realtime, open the office as a teammate in another tab:
          </p>
          <ul class="max-h-56 overflow-y-auto">
            <li v-for="employee in others" :key="employee.id">
              <button
                type="button"
                class="flex w-full items-center gap-2 rounded-lg px-1.5 py-1.5 text-left text-xs text-muted transition-colors hover:bg-hover hover:text-ink"
                @click="openAs(employee.id)"
              >
                <EmployeeAvatar :employee="employee" size="xs" :show-presence="false" />
                <span class="flex-1 truncate">Open as {{ employee.displayName }}</span>
                <ExternalLink :size="12" />
              </button>
            </li>
          </ul>
        </div>
      </div>
    </Transition>
  </div>
</template>
