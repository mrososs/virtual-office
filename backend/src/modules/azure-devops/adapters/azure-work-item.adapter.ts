import type { ActivitySignal } from '@virtual-office/shared';
import { AzureWorkItem } from '../azure.types';

/**
 * Adapter contract: translates one Azure DevOps resource shape into a
 * shared `ActivitySignal`. Each Azure resource type (work item, pull
 * request, build) gets its own adapter implementing this interface, so
 * `AzureSyncService` can treat them uniformly.
 */
export interface AzureResourceAdapter<TResource> {
  toActivitySignal(resource: TResource, employeeId: string): ActivitySignal | null;
}

/** Example adapter: an assigned, active work item -> a WORKING signal. */
export class AzureWorkItemAdapter implements AzureResourceAdapter<AzureWorkItem> {
  toActivitySignal(resource: AzureWorkItem, employeeId: string): ActivitySignal | null {
    // TODO: real mapping — vary ActivityType by System.State (e.g. "In Review" -> CODE_REVIEW),
    // set confidence based on recency of System.ChangedDate, etc.
    return {
      id: `azure-work-item-${resource.id}`,
      employeeId,
      source: 'AZURE_DEVOPS',
      type: 'WORKING',
      confidence: 0.5,
      title: resource.fields['System.Title'],
      workItemId: String(resource.id),
      occurredAt: resource.fields['System.ChangedDate'],
    };
  }
}
