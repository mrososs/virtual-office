<script setup lang="ts">
import type { AzureTokenUpdateResponse } from '@virtual-office/shared';
import { CheckCircle2, CircleAlert } from 'lucide-vue-next';
import { computed, shallowRef } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { BaseButton } from '@/shared/components';

import { useIntegrationsStatus } from '../composables/useIntegrationsStatus';
import { AZURE_CONNECT_RESULTS, isConnectResult } from '../integration-messages';

import AzureDevOpsIntegration from './AzureDevOpsIntegration.vue';
import IntegrationCard from './IntegrationCard.vue';
import UpdateAzureTokenDialog from './UpdateAzureTokenDialog.vue';

type NoticeTone = 'success' | 'warning' | 'danger';

const NOTICE_CLASSES: Record<NoticeTone, string> = {
  success: 'border-emerald-400/20 bg-emerald-400/[0.06] text-emerald-100/90',
  warning: 'border-amber-400/20 bg-amber-400/[0.06] text-amber-100/90',
  danger: 'border-rose-400/25 bg-rose-400/[0.07] text-rose-100/90',
};

const route = useRoute();
const router = useRouter();
const { state, load, syncing, verifying, lastSync, saveAzureToken, verifyAzure, syncAzure, disconnectAzure, connectAzureWithMicrosoft } = useIntegrationsStatus();

const tokenDialogOpen = shallowRef(false);
const flash = shallowRef<{ tone: NoticeTone; text: string } | null>(null);

// Future Entra mode: result of a consent round trip (`?azureDevOps=`), shown once, then removed from the URL.
if (isConnectResult(route.query.azureDevOps)) {
  const message = AZURE_CONNECT_RESULTS[route.query.azureDevOps];
  flash.value = { tone: message.tone, text: message.text.replace('{org}', 'configured').replace('{project}', 'configured') };
  void router.replace({ query: {} });
}

const notice = computed(() => (flash.value ? { classes: NOTICE_CLASSES[flash.value.tone], icon: flash.value.tone === 'success' ? CheckCircle2 : CircleAlert, text: flash.value.text } : null));

function onTokenSaved(result: AzureTokenUpdateResponse): void {
  flash.value =
    result.status === 'CONNECTED'
      ? { tone: 'success', text: 'Token saved and verified. Your Azure DevOps work will appear after the next sync.' }
      : { tone: 'warning', text: result.message ?? 'Token saved, but the connection needs attention.' };
}

async function disconnect(): Promise<void> {
  if (!window.confirm('Remove your saved Azure DevOps token? You stay signed in to the office; add a token again any time.')) return;
  await disconnectAzure();
  flash.value = { tone: 'success', text: 'Your Azure DevOps token was removed from the server.' };
}
</script>

<template>
  <div>
    <div v-if="notice" class="mt-4 flex items-start gap-2 rounded-lg border p-3 text-[13px]" :class="notice.classes" role="status">
      <component :is="notice.icon" :size="15" class="mt-0.5 shrink-0" />
      {{ notice.text }}
    </div>

    <p v-if="state.status === 'loading' && !state.data" class="mt-6 text-[13px] text-muted">Loading integrations…</p>
    <div v-else-if="state.status === 'error' && !state.data" class="mt-6 flex items-center gap-3 text-[13px] text-rose-300/90">
      Could not load integration status.
      <BaseButton size="sm" @click="load">Retry</BaseButton>
    </div>

    <div v-if="state.data" class="mt-6 grid gap-4 md:grid-cols-2">
      <AzureDevOpsIntegration
        :status="state.data.azureDevOps"
        :microsoft-available="state.data.authProvider === 'microsoft_entra'"
        :syncing="syncing"
        :verifying="verifying"
        :last-sync="lastSync"
        @update-token="tokenDialogOpen = true"
        @connect-microsoft="connectAzureWithMicrosoft"
        @verify="verifyAzure"
        @sync="syncAzure"
        @disconnect="disconnect"
      />

      <IntegrationCard v-if="state.data.microsoft" name="Microsoft account" mark="MS" color="#5b5fc7" :status="{ label: 'Connected', color: '#22c55e' }">
        <p>You're signed in with Microsoft Entra ID (single sign-on). The app only knows your name and work email.</p>
        <p class="mt-3 truncate text-ink" :title="state.data.microsoft.email">{{ state.data.microsoft.email }}</p>
      </IntegrationCard>

      <IntegrationCard name="Microsoft Teams & Calendar" mark="T" color="#4b53bc" :status="{ label: 'Not available yet', color: '#94a3b8' }">
        <p>Teams and Calendar integration requires Microsoft Entra application approval from IT and will be added later.</p>
        <p class="mt-2 text-2xs text-subtle">Meetings, rooms and Teams join links in the office keep working with the data available until then.</p>
      </IntegrationCard>
    </div>

    <UpdateAzureTokenDialog
      v-if="state.data"
      v-model:open="tokenDialogOpen"
      :organization="state.data.azureDevOps.organization"
      :save="saveAzureToken"
      @saved="onTokenSaved"
    />
  </div>
</template>
