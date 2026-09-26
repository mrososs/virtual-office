<script setup lang="ts">
import { computed } from 'vue';

import { runtimeEnv } from '@/core/config';
import DesktopAppCard from '@/features/pwa/components/DesktopAppCard.vue';
import { useAuthStore } from '@/stores/auth.store';
import { useOfficeStore } from '@/stores/office.store';

import IntegrationsSummaryCard from '../components/IntegrationsSummaryCard.vue';
import ProfileCard from '../components/ProfileCard.vue';

const authStore = useAuthStore();
const officeStore = useOfficeStore();

const SESSION_LABELS = {
  azure_pat: 'Signed in with your Azure DevOps token',
  microsoft_entra: 'Signed in with Microsoft',
  demo: 'Demo session (no credentials)',
} as const;

const sessionLabel = computed(() => (authStore.isDemoSession ? SESSION_LABELS.demo : authStore.provider ? SESSION_LABELS[authStore.provider] : 'Signed in'));
const sessionExpiry = computed(() => (authStore.sessionExpiresAt ? new Date(authStore.sessionExpiresAt).toLocaleDateString() : null));
</script>

<template>
  <div class="h-full overflow-y-auto">
    <div class="mx-auto max-w-[720px] space-y-6 px-6 py-8">
      <h1 class="text-lg font-semibold">Settings</h1>

      <ProfileCard />
      <IntegrationsSummaryCard v-if="!authStore.isDemoSession" />
      <DesktopAppCard />

      <section class="vo-panel p-5">
        <p class="vo-section-label mb-3">Workspace</p>
        <dl class="grid grid-cols-[140px_1fr] gap-y-2 text-[13px]">
          <dt class="text-subtle">Organization</dt>
          <dd>{{ officeStore.organizationName || 'iSaned' }}</dd>
          <dt class="text-subtle">Office</dt>
          <dd>{{ [officeStore.office?.name, officeStore.floor?.name].filter(Boolean).join(' · ') || '—' }}</dd>
          <dt class="text-subtle">Session</dt>
          <dd>{{ sessionLabel }}<span v-if="sessionExpiry" class="text-subtle"> · until {{ sessionExpiry }} at the latest</span></dd>
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
