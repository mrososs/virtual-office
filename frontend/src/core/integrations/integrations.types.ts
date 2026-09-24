import type { UUID } from '@virtual-office/shared';

export type IntegrationConnectionStatus = 'NOT_CONNECTED' | 'CONNECTED' | 'ERROR' | 'EXPIRED';

export interface AzureDevOpsSettings {
  organizationId: UUID;
  status: IntegrationConnectionStatus;
  azureOrganizationUrl?: string;
  connectedProjectIds: string[];
}

export interface MicrosoftIntegrationSettings {
  organizationId: UUID;
  status: IntegrationConnectionStatus;
  tenantId?: string;
  calendarSyncEnabled: boolean;
  teamsPresenceSyncEnabled: boolean;
}
