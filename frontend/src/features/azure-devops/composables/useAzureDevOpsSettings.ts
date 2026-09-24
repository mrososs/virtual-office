import { onMounted } from 'vue';

import { azureDevOpsIntegrationService } from '@/core/integrations';
import type { AzureDevOpsSettings } from '@/core/integrations';
import { useAsyncState } from '@/shared/composables';

export function useAzureDevOpsSettings() {
  const { state, run } = useAsyncState<AzureDevOpsSettings>();

  function load(): Promise<void> {
    return run(() => azureDevOpsIntegrationService.getSettings());
  }

  async function connect(): Promise<void> {
    // TODO: call backend once azure-devops/microsoft modules are implemented.
    const { redirectUrl } = await azureDevOpsIntegrationService.startOAuthFlow();
    window.location.href = redirectUrl;
  }

  onMounted(load);

  return { state, connect, disconnect: azureDevOpsIntegrationService.disconnect };
}
