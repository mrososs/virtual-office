import type { ISODateString, UUID } from './common.types.js';

/**
 * Internal work-tracking domain models. Provider adapters (Azure DevOps today)
 * map raw API/webhook payloads into these; nothing downstream should see raw
 * provider shapes.
 */
export type WorkProvider = 'AZURE_DEVOPS';

export type WorkItemType = 'TASK' | 'BUG' | 'USER_STORY' | 'FEATURE';

export type WorkItemState = 'NEW' | 'ACTIVE' | 'IN_REVIEW' | 'BLOCKED' | 'RESOLVED' | 'CLOSED';

export interface WorkItem {
  id: UUID;
  organizationId: UUID;
  provider: WorkProvider;
  /** Provider-facing number, e.g. Azure DevOps work item 16178. */
  externalId: string;
  type: WorkItemType;
  title: string;
  state: WorkItemState;
  assignedEmployeeId: UUID | null;
  projectName: string;
  url: string | null;
  updatedAt: ISODateString;
}

export type PullRequestStatus = 'DRAFT' | 'ACTIVE' | 'APPROVED' | 'COMPLETED' | 'ABANDONED';

export interface PullRequest {
  id: UUID;
  organizationId: UUID;
  provider: WorkProvider;
  externalId: string;
  title: string;
  repository: string;
  sourceBranch: string;
  targetBranch: string;
  status: PullRequestStatus;
  authorEmployeeId: UUID | null;
  reviewerEmployeeIds: UUID[];
  linkedWorkItemId: UUID | null;
  url: string | null;
  updatedAt: ISODateString;
}

export type BuildStatus = 'QUEUED' | 'RUNNING' | 'SUCCEEDED' | 'FAILED' | 'CANCELLED';

export interface Build {
  id: UUID;
  organizationId: UUID;
  provider: WorkProvider;
  externalId: string;
  pipelineName: string;
  branch: string;
  status: BuildStatus;
  triggeredByEmployeeId: UUID | null;
  startedAt: ISODateString | null;
  finishedAt: ISODateString | null;
  url: string | null;
}

export interface Sprint {
  id: UUID;
  name: string;
  startAt: ISODateString;
  endAt: ISODateString;
  workItemCount: number;
}
