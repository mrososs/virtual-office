import type { AzureDevOpsConnectionStatus, AzureDevOpsConnectResult } from '@virtual-office/shared';

export const AZURE_STATUS_BADGE: Record<AzureDevOpsConnectionStatus, { label: string; color: string }> = {
  NOT_CONFIGURED: { label: 'Not configured', color: '#94a3b8' },
  NOT_CONNECTED: { label: 'Not connected', color: '#94a3b8' },
  CONNECTED: { label: 'Connected', color: '#22c55e' },
  EXPIRED: { label: 'Needs attention', color: '#f59e0b' },
  INVALID: { label: 'Needs attention', color: '#f59e0b' },
  ERROR: { label: 'Needs attention', color: '#ef4444' },
};

/** Statuses where the employee should act (renew / fix their token). */
export const AZURE_NEEDS_ATTENTION: ReadonlySet<AzureDevOpsConnectionStatus> = new Set(['EXPIRED', 'INVALID', 'ERROR']);

/** Future Entra mode: `/integrations?azureDevOps=<result>` → a sentence. `{org}` / `{project}` are filled in by the page. */
export const AZURE_CONNECT_RESULTS: Record<AzureDevOpsConnectResult, { tone: 'success' | 'warning' | 'danger'; text: string }> = {
  connected: { tone: 'success', text: 'Azure DevOps connected. The first sync is running now.' },
  account_mismatch: { tone: 'warning', text: 'Please consent with the same Microsoft account you use for the Virtual Office.' },
  organization_inaccessible: { tone: 'danger', text: "Your account can't access the Azure DevOps organization {org}." },
  project_inaccessible: { tone: 'danger', text: "Your account can't access the Azure DevOps project {project}." },
  consent_required: { tone: 'warning', text: 'Consent is required. An iSaned Entra administrator may need to approve the Azure DevOps permissions.' },
  cancelled: { tone: 'warning', text: 'Connecting Azure DevOps was cancelled.' },
  not_configured: { tone: 'warning', text: 'Connecting through Microsoft is not available on this server. Use "Update token" with an Azure DevOps token instead.' },
  service_unavailable: { tone: 'warning', text: 'Microsoft or Azure DevOps is temporarily unavailable. Try again in a moment.' },
  failed: { tone: 'danger', text: 'Connecting Azure DevOps failed. Please try again.' },
};

export function isConnectResult(value: unknown): value is AzureDevOpsConnectResult {
  return typeof value === 'string' && value in AZURE_CONNECT_RESULTS;
}
