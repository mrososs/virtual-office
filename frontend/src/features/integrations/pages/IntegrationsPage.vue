<script setup lang="ts">
import { runtimeEnv } from '@/core/config';

import IntegrationsOverview from '../components/IntegrationsOverview.vue';
</script>

<template>
  <div class="h-full overflow-y-auto">
    <div class="mx-auto max-w-[880px] px-6 py-8">
      <h1 class="text-lg font-semibold">Integrations</h1>
      <p class="mt-1 max-w-[620px] text-[13px] leading-relaxed text-muted">
        Signals describe work — they never monitor devices, keyboards or screens. Everything is read-only.
      </p>

      <!-- Demo sessions have no server session: nothing real to connect. -->
      <div v-if="runtimeEnv.demoMode" class="mt-6 rounded-xl border border-amber-400/15 bg-amber-400/[0.05] p-5 text-[13px] leading-relaxed text-amber-100/80">
        Demo mode: work items, pull requests, builds and meetings are simulated. Sign in with an Azure DevOps token on a production backend to connect the real project.
      </div>
      <IntegrationsOverview v-else />
    </div>
  </div>
</template>
