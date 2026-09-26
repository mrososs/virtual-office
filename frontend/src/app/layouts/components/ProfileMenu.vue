<script setup lang="ts">
import { employeeTitleWithTeam, type UUID } from '@virtual-office/shared';
import { ExternalLink, LogOut, Plug, Settings, Shirt } from 'lucide-vue-next';
import { computed, shallowRef, useTemplateRef } from 'vue';

import { runtimeEnv } from '@/core/config';
import { useSignOut } from '@/features/auth/composables/useSignOut';
import EmployeeAvatar from '@/features/employees/components/EmployeeAvatar.vue';
import InstallAppButton from '@/features/pwa/components/InstallAppButton.vue';
import { usePwaInstall } from '@/features/pwa/install-prompt';
import { useClickOutside } from '@/shared/composables';
import { useAuthStore } from '@/stores/auth.store';
import { useEmployeeStore } from '@/stores/employee.store';

const authStore = useAuthStore();
const employeeStore = useEmployeeStore();
const { signOut, signingOut } = useSignOut();
const { canInstall } = usePwaInstall();

const open = shallowRef(false);
const root = useTemplateRef<HTMLElement>('root');
useClickOutside(root, open, () => (open.value = false));

const me = computed(() => (authStore.currentEmployeeId ? employeeStore.byId(authStore.currentEmployeeId) : undefined));
const email = computed(() => authStore.currentUser?.email ?? me.value?.email ?? '');
const others = computed(() => employeeStore.all.filter((employee) => employee.id !== authStore.currentEmployeeId && employee.presence.status === 'ONLINE'));

const actions = [
  { label: 'Edit avatar', icon: Shirt, to: { name: 'office-avatar' } },
  { label: 'Profile & settings', icon: Settings, to: { name: 'settings' } },
  { label: 'Integrations', icon: Plug, to: { name: 'integrations' } },
] as const;

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
          <EmployeeAvatar :employee="me" size="lg" />
          <div class="min-w-0">
            <p class="truncate text-[13px] font-semibold">{{ me.displayName }}</p>
            <p class="truncate text-xs text-muted">{{ employeeTitleWithTeam(me) }}</p>
            <p v-if="email" class="truncate text-2xs text-subtle" :title="email">{{ email }}</p>
          </div>
        </div>
        <ul class="border-b border-line/[0.06] p-1.5">
          <li v-for="action in actions" :key="action.label">
            <RouterLink
              :to="action.to"
              class="flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-[13px] text-muted transition-colors hover:bg-hover hover:text-ink"
              @click="open = false"
            >
              <component :is="action.icon" :size="14" /> {{ action.label }}
            </RouterLink>
          </li>
          <li v-if="canInstall"><InstallAppButton variant="menu" @installed="open = false" /></li>
        </ul>
        <div v-if="!authStore.isDemoSession" class="p-1.5">
          <button
            type="button"
            class="flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left text-[13px] text-muted transition-colors hover:bg-hover hover:text-ink disabled:opacity-50"
            :disabled="signingOut"
            @click="signOut()"
          >
            <LogOut :size="14" /> {{ signingOut ? 'Signing out…' : 'Sign out' }}
          </button>
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
