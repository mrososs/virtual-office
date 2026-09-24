<script setup lang="ts">
import { BaseButton } from '@/shared/components';

import { useAzureDevOpsSettings } from '../composables/useAzureDevOpsSettings';

const { state, connect } = useAzureDevOpsSettings();
</script>

<template>
  <div class="p-6">
    <h1 class="mb-4 text-lg font-semibold">Azure DevOps</h1>
    <p v-if="state.status === 'loading'" class="text-sm text-slate-400">Loading…</p>
    <div v-else-if="state.data" class="space-y-3 text-sm">
      <p>Status: <span class="font-medium">{{ state.data.status }}</span></p>
      <BaseButton v-if="state.data.status !== 'CONNECTED'" @click="connect">Connect Azure DevOps</BaseButton>
    </div>
  </div>
</template>
