import type { AzureSyncNowResponse, AzureTokenUpdateResponse, IntegrationsStatusResponse } from '@virtual-office/shared';
import { onMounted, shallowRef } from 'vue';

import { apiUrl, httpClient } from '@/core/api';
import { useAsyncState } from '@/shared/composables';
import { useAuthStore } from '@/stores/auth.store';

/**
 * Integrations page state. All provider work happens in the backend; the
 * browser only calls our own API (a new token is posted once and never
 * returned).
 */
export function useIntegrationsStatus() {
  const authStore = useAuthStore();
  const { state, run } = useAsyncState<IntegrationsStatusResponse>();
  const syncing = shallowRef(false);
  const verifying = shallowRef(false);
  const lastSync = shallowRef<AzureSyncNowResponse | null>(null);

  function load(): Promise<void> {
    return run(async () => {
      const status = await httpClient.get<IntegrationsStatusResponse>('/integrations/status');
      authStore.setAzureDevOpsStatus(status.azureDevOps.status);
      return status;
    });
  }

  /** Saves / replaces my Azure DevOps token. Throws `ApiError` (with a code) when refused. */
  async function saveAzureToken(token: string, expiresOn: string | null): Promise<AzureTokenUpdateResponse> {
    const result = await httpClient.post<AzureTokenUpdateResponse>('/integrations/azure/token', { token, expiresOn });
    authStore.setAzureDevOpsStatus(result.status);
    await load();
    return result;
  }

  async function verifyAzure(): Promise<void> {
    verifying.value = true;
    try {
      await httpClient.post<AzureTokenUpdateResponse>('/integrations/azure/verify');
    } finally {
      verifying.value = false;
      await load();
    }
  }

  async function syncAzure(): Promise<void> {
    syncing.value = true;
    try {
      lastSync.value = await httpClient.post<AzureSyncNowResponse>('/integrations/azure/sync');
    } catch {
      lastSync.value = { outcome: 'FAILED', reason: 'The sync request did not reach the server.' };
    } finally {
      syncing.value = false;
      await load();
    }
  }

  async function disconnectAzure(): Promise<void> {
    await httpClient.delete<void>('/integrations/azure');
    await load();
  }

  /** Future Microsoft Entra mode only: incremental consent (full-page round trip through Microsoft). */
  function connectAzureWithMicrosoft(): void {
    window.location.assign(apiUrl('/integrations/azure/connect'));
  }

  onMounted(load);

  return { state, load, syncing, verifying, lastSync, saveAzureToken, verifyAzure, syncAzure, disconnectAzure, connectAzureWithMicrosoft };
}
