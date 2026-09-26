<script setup lang="ts">
import { ChevronRight } from 'lucide-vue-next';
import { computed } from 'vue';

import { AZURE_STATUS_BADGE } from '@/features/integrations/integration-messages';
import { StatusBadge } from '@/shared/components';
import { useAuthStore } from '@/stores/auth.store';

/** Settings → Integrations at a glance; details and actions live on the Integrations page. */
const authStore = useAuthStore();
const azureBadge = computed(() => (authStore.azureDevOpsStatus ? AZURE_STATUS_BADGE[authStore.azureDevOpsStatus] : { label: 'Unknown', color: '#94a3b8' }));
</script>

<template>
  <section class="vo-panel p-5">
    <p class="vo-section-label mb-3">Integrations</p>
    <ul class="divide-y divide-line/[0.06] text-[13px]">
      <li>
        <RouterLink :to="{ name: 'integrations' }" class="flex items-center gap-3 py-2.5 text-ink hover:text-accent">
          <span class="flex-1">Azure DevOps</span>
          <StatusBadge :color="azureBadge.color" :label="azureBadge.label" />
          <ChevronRight :size="14" class="text-subtle" />
        </RouterLink>
      </li>
      <li class="flex items-center gap-3 py-2.5">
        <span class="flex-1 text-ink">Microsoft Teams &amp; Calendar</span>
        <StatusBadge color="#94a3b8" label="Coming later" />
      </li>
    </ul>
    <p class="mt-2 text-2xs text-subtle">Teams and Calendar need Microsoft Entra approval from IT.</p>
  </section>
</template>
