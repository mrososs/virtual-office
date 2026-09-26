import type {
  Build,
  BuildStatus,
  PullRequest,
  PullRequestStatus,
  Sprint,
  UUID,
  WorkItem,
  WorkItemState,
  WorkItemType,
} from '@virtual-office/shared';
import type { AzureBuild, AzureIdentityRef, AzurePullRequest, AzureWorkItem } from './azure.types';
import type { AzureBuildRow, AzurePullRequestRow, AzureWorkItemRow } from './repositories/azure-rows';
import type { AzureIdentityMapping } from './repositories/azure-identity.repository';
import type { AzureSyncState } from './repositories/azure-sync-state.repository';

/* Identity resolution ------------------------------------------------------ */

/**
 * Azure identity → employee: the stored mapping by Azure identity id first
 * (verified or team-member email match), then a direct uniqueName = employee
 * email match. Display names are never used.
 */
export class AzureEmployeeResolver {
  private readonly byIdentityId = new Map<string, UUID>();
  private readonly byEmail = new Map<string, UUID>();

  constructor(mappings: readonly AzureIdentityMapping[], employees: ReadonlyArray<{ id: UUID; email: string }>) {
    for (const mapping of mappings) this.byIdentityId.set(mapping.azureIdentityId, mapping.employeeId);
    for (const employee of employees) this.byEmail.set(employee.email.toLowerCase(), employee.id);
  }

  resolve(identity: AzureIdentityRef | undefined | null): UUID | null {
    if (!identity) return null;
    return this.byIdentityId.get(identity.id) ?? this.byEmail.get(identity.uniqueName?.toLowerCase() ?? '') ?? null;
  }
}

/* Raw API → rows ----------------------------------------------------------- */

export function toWorkItemRow(item: AzureWorkItem, resolver: AzureEmployeeResolver, url: string, syncedAt: string): AzureWorkItemRow {
  const assignee = item.fields['System.AssignedTo'];
  return {
    work_item_id: item.id,
    title: item.fields['System.Title'],
    work_item_type: item.fields['System.WorkItemType'],
    state: item.fields['System.State'],
    assigned_to_identity_id: assignee?.id ?? null,
    assigned_to_unique_name: assignee?.uniqueName ?? null,
    assigned_to_display_name: assignee?.displayName ?? null,
    assigned_employee_id: resolver.resolve(assignee),
    iteration_path: item.fields['System.IterationPath'] ?? null,
    tags: (item.fields['System.Tags'] ?? '')
      .split(';')
      .map((tag) => tag.trim())
      .filter(Boolean),
    url,
    changed_at: item.fields['System.ChangedDate'],
    synced_at: syncedAt,
  };
}

export function toPullRequestRow(pr: AzurePullRequest, resolver: AzureEmployeeResolver, url: string, syncedAt: string): AzurePullRequestRow {
  const reviewers = (pr.reviewers ?? [])
    .filter((reviewer) => !reviewer.isContainer)
    .map((reviewer) => ({
      identityId: reviewer.id,
      uniqueName: reviewer.uniqueName,
      displayName: reviewer.displayName,
      vote: reviewer.vote,
      isRequired: Boolean(reviewer.isRequired),
      employeeId: resolver.resolve(reviewer),
    }));
  return {
    pull_request_id: pr.pullRequestId,
    repository_id: pr.repository.id,
    repository_name: pr.repository.name,
    title: pr.title,
    status: pr.status,
    is_draft: Boolean(pr.isDraft),
    created_by_identity_id: pr.createdBy?.id ?? null,
    created_by_unique_name: pr.createdBy?.uniqueName ?? null,
    created_by_display_name: pr.createdBy?.displayName ?? null,
    author_employee_id: resolver.resolve(pr.createdBy),
    reviewers,
    reviewer_employee_ids: reviewers.map((reviewer) => reviewer.employeeId).filter((id): id is string => id !== null),
    source_ref: pr.sourceRefName ?? null,
    target_ref: pr.targetRefName ?? null,
    created_at_azure: pr.creationDate,
    closed_at: pr.closedDate ?? null,
    url,
    synced_at: syncedAt,
  };
}

export function toBuildRow(build: AzureBuild, resolver: AzureEmployeeResolver, fallbackUrl: string, syncedAt: string): AzureBuildRow {
  return {
    build_id: build.id,
    build_number: build.buildNumber,
    pipeline_id: build.definition?.id ?? null,
    pipeline_name: build.definition?.name ?? 'Pipeline',
    status: build.status,
    result: build.result ?? null,
    requested_for_identity_id: build.requestedFor?.id ?? null,
    requested_for_unique_name: build.requestedFor?.uniqueName ?? null,
    requested_for_display_name: build.requestedFor?.displayName ?? null,
    requested_for_employee_id: resolver.resolve(build.requestedFor),
    source_branch: build.sourceBranch ?? null,
    queued_at: build.queueTime ?? null,
    started_at: build.startTime ?? null,
    finished_at: build.finishTime ?? null,
    url: build._links?.web?.href ?? fallbackUrl,
    synced_at: syncedAt,
  };
}

/* Rows → shared domain ----------------------------------------------------- */

const STATE_BY_NAME: Record<string, WorkItemState> = {
  new: 'NEW',
  'to do': 'NEW',
  proposed: 'NEW',
  approved: 'NEW',
  active: 'ACTIVE',
  'in progress': 'ACTIVE',
  // Custom states of the iSaned 'Saned System - Version 03' process (seen in real sync data).
  'dev in progress': 'ACTIVE',
  'ready for testing': 'ACTIVE',
  committed: 'ACTIVE',
  doing: 'ACTIVE',
  open: 'ACTIVE',
  'ready for test': 'ACTIVE',
  'in test': 'ACTIVE',
  testing: 'ACTIVE',
  'in review': 'IN_REVIEW',
  'code review': 'IN_REVIEW',
  review: 'IN_REVIEW',
  blocked: 'BLOCKED',
  'on hold': 'BLOCKED',
  resolved: 'RESOLVED',
  closed: 'CLOSED',
  done: 'CLOSED',
  completed: 'CLOSED',
  removed: 'CLOSED',
};

const TESTING_STATES = new Set(['ready for test', 'ready for testing', 'in test', 'testing']);

/** Process-template states vary; unknown ones count as NEW so nobody looks busy by accident. A "Blocked" tag always wins. */
export function classifyWorkItemState(state: string, tags: readonly string[]): WorkItemState {
  if (tags.some((tag) => tag.toLowerCase() === 'blocked')) return 'BLOCKED';
  return STATE_BY_NAME[state.trim().toLowerCase()] ?? 'NEW';
}

export function isTestingState(state: string): boolean {
  return TESTING_STATES.has(state.trim().toLowerCase());
}

function classifyType(type: string): WorkItemType {
  switch (type.toLowerCase()) {
    case 'bug':
      return 'BUG';
    case 'user story':
    case 'product backlog item':
    case 'requirement':
      return 'USER_STORY';
    case 'feature':
      return 'FEATURE';
    default:
      return 'TASK';
  }
}

export const workItemId = (azureId: number): string => `ado-wi-${azureId}`;
export const pullRequestId = (azureId: number): string => `ado-pr-${azureId}`;
export const buildId = (azureId: number): string => `ado-build-${azureId}`;

export function toWorkItem(row: AzureWorkItemRow, organizationId: string, projectName: string): WorkItem {
  return {
    id: workItemId(row.work_item_id),
    organizationId,
    provider: 'AZURE_DEVOPS',
    externalId: String(row.work_item_id),
    type: classifyType(row.work_item_type),
    title: row.title,
    state: classifyWorkItemState(row.state, row.tags),
    assignedEmployeeId: row.assigned_employee_id,
    projectName,
    url: row.url,
    updatedAt: row.changed_at,
  };
}

function classifyPullRequest(row: AzurePullRequestRow): PullRequestStatus {
  if (row.status === 'completed') return 'COMPLETED';
  if (row.status === 'abandoned') return 'ABANDONED';
  if (row.is_draft) return 'DRAFT';
  const votes = row.reviewers.map((reviewer) => reviewer.vote);
  return votes.some((vote) => vote >= 5) && !votes.some((vote) => vote < 0) ? 'APPROVED' : 'ACTIVE';
}

const branchName = (ref: string | null): string => (ref ?? '').replace(/^refs\/heads\//, '');

export function toPullRequest(row: AzurePullRequestRow, organizationId: string): PullRequest {
  return {
    id: pullRequestId(row.pull_request_id),
    organizationId,
    provider: 'AZURE_DEVOPS',
    externalId: String(row.pull_request_id),
    title: row.title,
    repository: row.repository_name,
    sourceBranch: branchName(row.source_ref),
    targetBranch: branchName(row.target_ref),
    status: classifyPullRequest(row),
    authorEmployeeId: row.author_employee_id,
    reviewerEmployeeIds: row.reviewer_employee_ids,
    linkedWorkItemId: null,
    url: row.url,
    updatedAt: row.closed_at ?? row.created_at_azure,
  };
}

function classifyBuild(row: AzureBuildRow): BuildStatus {
  if (row.status === 'inProgress') return 'RUNNING';
  if (row.status === 'notStarted' || row.status === 'postponed' || row.status === 'none') return 'QUEUED';
  if (row.status === 'cancelling' || row.result === 'canceled') return 'CANCELLED';
  if (row.result === 'failed') return 'FAILED';
  return 'SUCCEEDED';
}

export function toBuild(row: AzureBuildRow, organizationId: string): Build {
  return {
    id: buildId(row.build_id),
    organizationId,
    provider: 'AZURE_DEVOPS',
    externalId: row.build_number || String(row.build_id),
    pipelineName: row.pipeline_name,
    branch: branchName(row.source_branch),
    status: classifyBuild(row),
    triggeredByEmployeeId: row.requested_for_employee_id,
    startedAt: row.started_at,
    finishedAt: row.finished_at,
    url: row.url,
  };
}

export function toSprint(state: AzureSyncState): Sprint | null {
  if (!state.iterationId || !state.iterationName || !state.iterationStart || !state.iterationEnd) return null;
  return {
    id: `ado-iteration-${state.iterationId}`,
    name: state.iterationName,
    startAt: state.iterationStart,
    endAt: state.iterationEnd,
    workItemCount: state.workItemCount,
  };
}
