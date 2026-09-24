import { httpClient } from '@/core/api';

import type { AzureDevOpsSettings } from './integrations.types';

/**
 * Frontend-side stub for the Azure DevOps integration settings API.
 * No real Azure DevOps calls happen here or anywhere else in the frontend —
 * all provider communication is backend-only.
 */
export const azureDevOpsIntegrationService = {
  async getSettings(): Promise<AzureDevOpsSettings> {
    // TODO: call backend once azure-devops/microsoft modules are implemented.
    return httpClient.get<AzureDevOpsSettings>('/integrations/azure-devops/settings');
  },

  async startOAuthFlow(): Promise<{ redirectUrl: string }> {
    // TODO: call backend once azure-devops/microsoft modules are implemented.
    return httpClient.post<{ redirectUrl: string }>('/integrations/azure-devops/oauth/start');
  },

  async disconnect(): Promise<void> {
    // TODO: call backend once azure-devops/microsoft modules are implemented.
    await httpClient.post<void>('/integrations/azure-devops/disconnect');
  },
};
