/**
 * Raw-ish shapes for Azure DevOps REST API / Service Hooks payloads, kept
 * deliberately loose (fields we actually plan to read, `unknown` elsewhere)
 * since we don't call the real API yet. These types must never leak past
 * this module's services/adapters — everything downstream (ActivityEngine,
 * RoomsService, etc.) only ever sees shared domain types (`ActivitySignal`,
 * etc.), never these.
 */

export interface AzureWorkItem {
  id: number;
  fields: {
    'System.Title': string;
    'System.State': string;
    'System.AssignedTo'?: { uniqueName: string; displayName: string };
    'System.ChangedDate': string;
  };
}

export interface AzurePullRequest {
  pullRequestId: number;
  title: string;
  status: 'active' | 'completed' | 'abandoned';
  createdBy: { uniqueName: string; displayName: string };
  reviewers: Array<{ uniqueName: string; displayName: string; vote: number }>;
  creationDate: string;
}

export interface AzureBuild {
  id: number;
  buildNumber: string;
  status: 'notStarted' | 'inProgress' | 'completed';
  result?: 'succeeded' | 'failed' | 'canceled' | 'partiallySucceeded';
  requestedFor: { uniqueName: string; displayName: string };
  startTime?: string;
  finishTime?: string;
}

/** Minimal envelope shared by every Azure DevOps Service Hooks payload. */
export interface AzureServiceHookEvent<TResource = unknown> {
  eventType: string;
  publisherId: string;
  resource: TResource;
  resourceContainers: {
    project: { id: string };
    account: { id: string };
  };
}
