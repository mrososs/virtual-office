import { httpClient } from '@/core/api';

import type { MicrosoftIntegrationSettings } from './integrations.types';

/**
 * Frontend-side stub for the Microsoft 365 / Teams integration settings API
 * (Microsoft Graph calendar + presence). No Graph calls happen in the
 * frontend — the backend owns all provider communication.
 */
export const microsoftIntegrationService = {
  async getSettings(): Promise<MicrosoftIntegrationSettings> {
    // TODO: call backend once azure-devops/microsoft modules are implemented.
    return httpClient.get<MicrosoftIntegrationSettings>('/integrations/microsoft/settings');
  },

  async startOAuthFlow(): Promise<{ redirectUrl: string }> {
    // TODO: call backend once azure-devops/microsoft modules are implemented.
    return httpClient.post<{ redirectUrl: string }>('/integrations/microsoft/oauth/start');
  },

  async disconnect(): Promise<void> {
    // TODO: call backend once azure-devops/microsoft modules are implemented.
    await httpClient.post<void>('/integrations/microsoft/disconnect');
  },
};
