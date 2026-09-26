<script setup lang="ts">
import { TriangleAlert } from 'lucide-vue-next';
import { computed } from 'vue';

import { runtimeEnv } from '@/core/config';
import { useAuthStore } from '@/stores/auth.store';

import { AZURE_NEEDS_ATTENTION } from '../integration-messages';

/**
 * Top-bar hint when the signed-in employee's Azure DevOps token needs renewing
 * or was never added. Informational only — the office always stays usable.
 */
const authStore = useAuthStore();

const label = computed(() => {
  const status = authStore.azureDevOpsStatus;
  if (runtimeEnv.demoMode || !status) return null;
  if (AZURE_NEEDS_ATTENTION.has(status)) return 'Azure connection needs attention';
  if (status === 'NOT_CONNECTED') return 'Connect Azure DevOps';
  return null;
});
</script>

<template>
  <RouterLink
    v-if="label"
    :to="{ name: 'integrations' }"
    class="hidden items-center gap-1.5 rounded-md border border-amber-400/25 bg-amber-400/[0.08] px-2 py-1 text-2xs font-medium text-amber-200 transition-colors hover:bg-amber-400/15 md:inline-flex"
    :title="label"
  >
    <TriangleAlert :size="12" /> {{ label }}
  </RouterLink>
</template>
