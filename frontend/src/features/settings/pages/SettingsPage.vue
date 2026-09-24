<script setup lang="ts">
import { computed } from 'vue';

import { runtimeEnv } from '@/core/config';
import EmployeeAvatar from '@/features/employees/components/EmployeeAvatar.vue';
import { useAuthStore } from '@/stores/auth.store';
import { useEmployeeStore } from '@/stores/employee.store';
import { useOfficeStore } from '@/stores/office.store';

const authStore = useAuthStore();
const employeeStore = useEmployeeStore();
const officeStore = useOfficeStore();

const me = computed(() => (authStore.currentEmployeeId ? employeeStore.byId(authStore.currentEmployeeId) : undefined));
</script>

<template>
  <div class="h-full overflow-y-auto">
    <div class="mx-auto max-w-[720px] space-y-6 px-6 py-8">
      <h1 class="text-lg font-semibold">Settings</h1>

      <section class="vo-panel p-5">
        <p class="vo-section-label mb-3">Profile</p>
        <div v-if="me" class="flex items-center gap-3">
          <EmployeeAvatar :employee="me" size="lg" />
          <div>
            <p class="text-sm font-semibold">{{ me.displayName }}</p>
            <p class="text-xs text-muted">{{ me.jobTitle }} · {{ officeStore.teamName(me.teamId) }}</p>
            <p class="text-2xs text-subtle">{{ me.email }}</p>
          </div>
        </div>
        <p v-else class="text-[13px] text-muted">Open the office once to load your profile.</p>
      </section>

      <section class="vo-panel p-5">
        <p class="vo-section-label mb-3">Workspace</p>
        <dl class="grid grid-cols-[140px_1fr] gap-y-2 text-[13px]">
          <dt class="text-subtle">Organization</dt>
          <dd>{{ officeStore.organizationName || '—' }}</dd>
          <dt class="text-subtle">Office</dt>
          <dd>{{ officeStore.office?.name ?? '—' }} · {{ officeStore.floor?.name ?? '' }}</dd>
          <dt class="text-subtle">Session</dt>
          <dd>{{ authStore.isDemoSession ? 'Demo session (no credentials)' : 'Signed in' }}</dd>
        </dl>
      </section>

      <section v-if="runtimeEnv.demoMode" class="rounded-xl border border-amber-400/15 bg-amber-400/[0.05] p-5 text-[13px] leading-relaxed text-amber-100/80">
        <p class="font-semibold text-amber-100">Demo mode is on</p>
        <p class="mt-1">
          Enabled by <code class="rounded bg-black/30 px-1 text-2xs">VITE_DEMO_MODE=true</code>. You're signed in as a seeded employee and the office runs a scripted simulation.
          Production authentication is unaffected; demo mode is never enabled in production builds.
        </p>
      </section>
    </div>
  </div>
</template>
