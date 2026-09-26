import type { ActivitySignal, UUID } from '@virtual-office/shared';
import { buildId, classifyWorkItemState, isTestingState, pullRequestId, workItemId } from './azure-work.mapper';
import type { AzureBuildRow, AzurePullRequestRow, AzureWorkItemRow } from './repositories/azure-rows';

/** A pending review only reads as "in code review" while the request is fresh; older ones sit in the queue. */
const REVIEW_REQUEST_WINDOW_MS = 4 * 60 * 60_000;
/** A draft PR someone opened recently is the best "coding right now" hint Azure DevOps gives without polling pushes. */
const DRAFT_CODING_WINDOW_MS = 8 * 60 * 60_000;

export interface AzureSignalInput {
  workItems: readonly AzureWorkItemRow[];
  pullRequests: readonly AzurePullRequestRow[];
  builds: readonly AzureBuildRow[];
}

/**
 * Azure DevOps data → `ActivitySignal`s, one list per employee. This is only
 * a signal source: which activity wins (e.g. a Teams MEETING over WORKING) is
 * decided by the ActivityEngine's resolution strategy, and presence is never
 * touched — Azure activity is not proof that anyone is at their desk.
 *
 * Every signal expires after `ttlMs` (a few sync intervals), so if syncing
 * stops the office falls back to "Available" instead of showing stale work.
 *
 *   assigned active item            → WORKING
 *   assigned item in a test state   → TESTING
 *   assigned blocked item / tag     → BLOCKED
 *   fresh review request (no vote)  → CODE_REVIEW
 *   own recent draft PR             → CODING
 *   own running build               → BUILDING
 */
export function deriveAzureSignals(input: AzureSignalInput, now: number, ttlMs: number): Map<UUID, ActivitySignal[]> {
  const occurredAt = new Date(now).toISOString();
  const expiresAt = new Date(now + ttlMs).toISOString();
  const signals = new Map<UUID, ActivitySignal[]>();
  const add = (signal: Omit<ActivitySignal, 'source' | 'expiresAt'>): void => {
    const list = signals.get(signal.employeeId) ?? [];
    list.push({ ...signal, source: 'AZURE_DEVOPS', expiresAt });
    signals.set(signal.employeeId, list);
  };

  for (const item of input.workItems) {
    if (!item.assigned_employee_id) continue;
    const state = classifyWorkItemState(item.state, item.tags);
    const base = { employeeId: item.assigned_employee_id, title: item.title, workItemId: workItemId(item.work_item_id), occurredAt: item.changed_at };
    if (state === 'BLOCKED') {
      add({ ...base, id: `azure:blocked:${item.work_item_id}`, type: 'BLOCKED', confidence: 0.75 });
    } else if (state === 'ACTIVE' && isTestingState(item.state)) {
      add({ ...base, id: `azure:testing:${item.work_item_id}`, type: 'TESTING', confidence: 0.6 });
    } else if (state === 'ACTIVE' || state === 'IN_REVIEW') {
      add({ ...base, id: `azure:working:${item.work_item_id}`, type: 'WORKING', confidence: 0.55 });
    }
  }

  for (const pr of input.pullRequests) {
    if (pr.status !== 'active') continue;
    const created = new Date(pr.created_at_azure).getTime();
    if (!pr.is_draft && now - created <= REVIEW_REQUEST_WINDOW_MS) {
      for (const reviewer of pr.reviewers) {
        if (!reviewer.employeeId || reviewer.vote !== 0 || reviewer.employeeId === pr.author_employee_id) continue;
        add({
          id: `azure:review:${pr.pull_request_id}:${reviewer.employeeId}`,
          employeeId: reviewer.employeeId,
          type: 'CODE_REVIEW',
          confidence: 0.6,
          title: pr.title,
          pullRequestId: pullRequestId(pr.pull_request_id),
          occurredAt: pr.created_at_azure,
        });
      }
    }
    if (pr.is_draft && pr.author_employee_id && now - created <= DRAFT_CODING_WINDOW_MS) {
      add({
        id: `azure:coding:${pr.pull_request_id}`,
        employeeId: pr.author_employee_id,
        type: 'CODING',
        confidence: 0.5,
        title: pr.title,
        pullRequestId: pullRequestId(pr.pull_request_id),
        occurredAt: pr.created_at_azure,
      });
    }
  }

  for (const build of input.builds) {
    if (build.status !== 'inProgress' || !build.requested_for_employee_id) continue;
    add({
      id: `azure:build:${build.build_id}`,
      employeeId: build.requested_for_employee_id,
      type: 'BUILDING',
      confidence: 0.7,
      title: build.pipeline_name,
      buildId: buildId(build.build_id),
      occurredAt: build.started_at ?? build.queued_at ?? occurredAt,
    });
  }

  return signals;
}
