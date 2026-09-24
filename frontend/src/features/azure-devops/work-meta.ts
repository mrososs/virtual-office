import type { BuildStatus, PullRequestStatus, WorkItemState, WorkItemType } from '@virtual-office/shared';

import type { StatusMeta } from '@/shared/constants';

export const WORK_ITEM_STATE_META: Record<WorkItemState, StatusMeta> = {
  NEW: { label: 'New', color: '#94a3b8' },
  ACTIVE: { label: 'Active', color: '#3b82f6' },
  IN_REVIEW: { label: 'In review', color: '#f97316' },
  BLOCKED: { label: 'Blocked', color: '#ef4444' },
  RESOLVED: { label: 'Resolved', color: '#22c55e' },
  CLOSED: { label: 'Closed', color: '#6b7280' },
};

export const WORK_ITEM_TYPE_LABEL: Record<WorkItemType, string> = {
  TASK: 'Task',
  BUG: 'Bug',
  USER_STORY: 'User story',
  FEATURE: 'Feature',
};

export const PULL_REQUEST_STATUS_META: Record<PullRequestStatus, StatusMeta> = {
  DRAFT: { label: 'Draft', color: '#94a3b8' },
  ACTIVE: { label: 'In review', color: '#f97316' },
  APPROVED: { label: 'Approved', color: '#22c55e' },
  COMPLETED: { label: 'Merged', color: '#8b5cf6' },
  ABANDONED: { label: 'Abandoned', color: '#6b7280' },
};

export const BUILD_STATUS_META: Record<BuildStatus, StatusMeta> = {
  QUEUED: { label: 'Queued', color: '#94a3b8' },
  RUNNING: { label: 'Running', color: '#eab308' },
  SUCCEEDED: { label: 'Succeeded', color: '#22c55e' },
  FAILED: { label: 'Failed', color: '#ef4444' },
  CANCELLED: { label: 'Cancelled', color: '#6b7280' },
};
