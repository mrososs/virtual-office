import { onMounted } from 'vue';

import { microsoftIntegrationService } from '@/core/integrations';
import type { MicrosoftIntegrationSettings } from '@/core/integrations';
import { useAsyncState } from '@/shared/composables';

export function useMicrosoftSettings() {
  const { state, run } = useAsyncState<MicrosoftIntegrationSettings>();

  function load(): Promise<void> {
    return run(() => microsoftIntegrationService.getSettings());
  }

  async function connect(): Promise<void> {
    // TODO: call backend once azure-devops/microsoft modules are implemented.
    const { redirectUrl } = await microsoftIntegrationService.startOAuthFlow();
    window.location.href = redirectUrl;
  }

  onMounted(load);

  return { state, connect, disconnect: microsoftIntegrationService.disconnect };
}
