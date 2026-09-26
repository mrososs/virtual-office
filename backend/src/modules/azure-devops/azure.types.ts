/**
 * Raw shapes of the Azure DevOps REST API (7.1) and Service Hooks payloads —
 * only the fields we read. These types must never leak past this module's
 * client/mappers: everything downstream (ActivityEngine, office state, Vue,
 * Phaser) sees the shared domain types (`WorkItem`, `PullRequest`, `Build`,
 * `ActivitySignal`) instead.
 */

export interface AzureListResponse<T> {
  count: number;
  value: T[];
}

export interface AzureIdentityRef {
  id: string;
  displayName: string;
  uniqueName: string;
  descriptor?: string;
}

/** `GET https://dev.azure.com/{org}/_apis/connectionData` — who the delegated token belongs to, in this org. */
export interface AzureConnectionData {
  authenticatedUser: {
    id: string;
    descriptor?: string;
    providerDisplayName: string;
    properties?: { Account?: { $value?: string } };
  };
}

export interface AzureProject {
  id: string;
  name: string;
  defaultTeam?: { id: string; name: string };
}

export interface AzureTeam {
  id: string;
  name: string;
}

export interface AzureTeamMember {
  identity: AzureIdentityRef;
}

export interface AzureIteration {
  id: string;
  name: string;
  path: string;
  attributes: { startDate?: string | null; finishDate?: string | null; timeFrame?: string };
}

export interface AzureWiqlResult {
  workItems: Array<{ id: number }>;
}

export interface AzureWorkItem {
  id: number;
  fields: {
    'System.Title': string;
    'System.WorkItemType': string;
    'System.State': string;
    'System.AssignedTo'?: AzureIdentityRef;
    'System.IterationPath'?: string;
    'System.Tags'?: string;
    'System.ChangedDate': string;
  };
}

export interface AzurePullRequestReviewer extends AzureIdentityRef {
  /** 10 approved, 5 approved with suggestions, 0 no vote, -5 waiting for author, -10 rejected. */
  vote: number;
  isRequired?: boolean;
  /** Group reviewers (e.g. "[Project]\Contributors"). */
  isContainer?: boolean;
}

export interface AzurePullRequest {
  pullRequestId: number;
  title: string;
  status: 'active' | 'completed' | 'abandoned' | 'notSet';
  isDraft?: boolean;
  createdBy: AzureIdentityRef;
  reviewers?: AzurePullRequestReviewer[];
  repository: { id: string; name: string };
  sourceRefName?: string;
  targetRefName?: string;
  creationDate: string;
  closedDate?: string;
}

export interface AzureBuild {
  id: number;
  buildNumber: string;
  status: 'none' | 'inProgress' | 'completed' | 'cancelling' | 'postponed' | 'notStarted' | 'all';
  result?: 'none' | 'succeeded' | 'partiallySucceeded' | 'failed' | 'canceled';
  definition: { id: number; name: string };
  requestedFor?: AzureIdentityRef;
  sourceBranch?: string;
  queueTime?: string;
  startTime?: string;
  finishTime?: string;
  _links?: { web?: { href?: string } };
}

/** Minimal envelope shared by every Azure DevOps Service Hooks payload (future push-based sync). */
export interface AzureServiceHookEvent<TResource = unknown> {
  eventType: string;
  publisherId: string;
  resource: TResource;
  resourceContainers: {
    project: { id: string };
    account: { id: string };
  };
}
