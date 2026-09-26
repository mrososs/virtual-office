<script setup lang="ts">
import type { AzureSyncNowResponse, IntegrationsStatusResponse } from '@virtual-office/shared';
import { KeyRound, Link2, RefreshCw, ShieldCheck, Unlink } from 'lucide-vue-next';
import { computed } from 'vue';

import { BaseButton } from '@/shared/components';
import { useNow } from '@/shared/composables';
import { formatRelativeTime } from '@/shared/utils/format';

import { AZURE_NEEDS_ATTENTION, AZURE_STATUS_BADGE } from '../integration-messages';

import IntegrationCard from './IntegrationCard.vue';

const props = defineProps<{
  status: IntegrationsStatusResponse['azureDevOps'];
  /** Microsoft consent is only offered once an Entra app registration exists. */
  microsoftAvailable: boolean;
  syncing: boolean;
  verifying: boolean;
  lastSync: AzureSyncNowResponse | null;
}>();
const emit = defineEmits<{ updateToken: []; connectMicrosoft: []; verify: []; sync: []; disconnect: [] }>();

const now = useNow(30_000);
const badge = computed(() => AZURE_STATUS_BADGE[props.status.status]);
const connected = computed(() => props.status.status === 'CONNECTED');
const needsAttention = computed(() => AZURE_NEEDS_ATTENTION.has(props.status.status));
const hasCredential = computed(() => connected.value || needsAttention.value);

const tokenLabel = computed(() => {
  if (props.status.credentialType === 'ENTRA') return 'Microsoft consent';
  if (!hasCredential.value) return '—';
  const expires = props.status.tokenExpiresAt;
  if (!expires) return 'Saved (encrypted) · expiry not given';
  const days = Math.ceil((Date.parse(expires) - now.value) / 86_400_000);
  if (days < 0) return `Expired on ${expires.slice(0, 10)}`;
  return `Saved (encrypted) · expires ${expires.slice(0, 10)}${days <= 7 ? ` — in ${days} day${days === 1 ? '' : 's'}` : ''}`;
});
const expiringSoon = computed(() => {
  const expires = props.status.tokenExpiresAt;
  return connected.value && expires !== null && Date.parse(expires) - now.value < 7 * 86_400_000;
});
const lastSyncLabel = computed(() => {
  const { sync } = props.status;
  if (sync.status === 'RUNNING') return 'Running now…';
  if (!sync.lastSuccessAt) return 'Never';
  return formatRelativeTime(sync.lastSuccessAt, now.value);
});
/** Team data older than a few intervals is shown as stale, never as current. */
const syncStale = computed(() => {
  const last = props.status.sync.lastSuccessAt;
  return last !== null && now.value - Date.parse(last) > 3 * props.status.syncIntervalSeconds * 1000;
});
const syncFeedback = computed(() => {
  if (!props.lastSync) return null;
  if (props.lastSync.outcome === 'SUCCEEDED') return { tone: 'text-emerald-300', text: 'Synced just now.' };
  if (props.lastSync.reason === 'no_connected_employee') return { tone: 'text-amber-300', text: 'Nobody on the team has a working Azure DevOps token yet.' };
  return { tone: 'text-rose-300', text: props.lastSync.reason ?? 'Sync failed.' };
});
</script>

<template>
  <IntegrationCard name="Azure DevOps" mark="AZ" color="#0078d4" :status="badge">
    <div v-if="needsAttention" class="mb-3 rounded-lg border border-amber-400/20 bg-amber-400/[0.06] p-3 text-xs leading-relaxed text-amber-100/90" role="status">
      <p class="font-semibold">Azure DevOps connection needs to be renewed.</p>
      <p v-if="status.lastError" class="mt-0.5 opacity-85">{{ status.lastError }}</p>
      <p class="mt-1 opacity-70">You can keep using the office meanwhile; your work status just won't update.</p>
    </div>

    <p>Read-only: sprint work items, pull requests and builds become activity (Working, Code review, Building, Blocked). Presence is never inferred from it.</p>
    <dl class="mt-3 grid grid-cols-[112px_1fr] gap-y-1.5">
      <dt class="text-subtle">Organization</dt>
      <dd class="text-ink">{{ status.organization ?? '—' }}</dd>
      <dt class="text-subtle">Project</dt>
      <dd class="text-ink">{{ status.project ?? '—' }}<span v-if="status.team" class="text-subtle"> · {{ status.team }}</span></dd>
      <dt class="text-subtle">Azure identity</dt>
      <dd class="truncate text-ink" :title="status.identity?.uniqueName">{{ status.identity ? `${status.identity.displayName} (${status.identity.uniqueName})` : '—' }}</dd>
      <dt class="text-subtle">Token</dt>
      <dd :class="expiringSoon ? 'text-amber-300' : 'text-ink'">{{ tokenLabel }}</dd>
      <dt class="text-subtle">Last check</dt>
      <dd class="text-ink">{{ status.lastVerifiedAt ? formatRelativeTime(status.lastVerifiedAt, now) : '—' }}</dd>
      <dt class="text-subtle">Team sync</dt>
      <dd :class="syncStale ? 'text-amber-300' : 'text-ink'">
        {{ lastSyncLabel }}<span v-if="syncStale"> · out of date</span>
        <span v-if="status.sync.lastSuccessAt" class="text-subtle"> · {{ status.sync.workItemCount }} items, {{ status.sync.pullRequestCount }} PRs, {{ status.sync.buildCount }} builds</span>
      </dd>
    </dl>
    <p v-if="status.sync.status === 'FAILED' && status.sync.error" class="mt-3 text-xs text-amber-300/90">Last sync failed: {{ status.sync.error }}</p>
    <p v-if="syncFeedback" class="mt-2 text-xs" :class="syncFeedback.tone">{{ syncFeedback.text }}</p>
    <p class="mt-3 text-2xs text-subtle">
      Syncs every {{ Math.round(status.syncIntervalSeconds / 60) }} min with one working team member's read-only token; each person's token is used only on the server.
    </p>

    <template #actions>
      <template v-if="status.status !== 'NOT_CONFIGURED'">
        <BaseButton :variant="hasCredential && !needsAttention ? 'secondary' : 'primary'" @click="emit('updateToken')">
          <KeyRound :size="14" /> {{ hasCredential ? 'Update token' : 'Add token' }}
        </BaseButton>
        <BaseButton v-if="microsoftAvailable && !connected" @click="emit('connectMicrosoft')"><Link2 :size="14" /> Connect with Microsoft</BaseButton>
        <BaseButton v-if="hasCredential" :disabled="verifying" @click="emit('verify')"><ShieldCheck :size="14" /> {{ verifying ? 'Checking…' : 'Verify' }}</BaseButton>
        <BaseButton :disabled="syncing" @click="emit('sync')">
          <RefreshCw :size="14" :class="syncing && 'animate-spin'" /> {{ syncing ? 'Syncing…' : 'Sync now' }}
        </BaseButton>
        <BaseButton v-if="hasCredential" variant="ghost" @click="emit('disconnect')"><Unlink :size="14" /> Disconnect</BaseButton>
      </template>
    </template>
  </IntegrationCard>
</template>
