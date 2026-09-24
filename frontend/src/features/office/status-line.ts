import type { Build, Employee, Meeting, PullRequest, UUID, WorkItem } from '@virtual-office/shared';

import { formatRelativeTime } from '@/shared/utils/format';

export interface StatusLookups {
  workItem(id: UUID | undefined): WorkItem | undefined;
  pullRequest(id: UUID | undefined): PullRequest | undefined;
  build(id: UUID | undefined): Build | undefined;
  meeting(id: UUID | undefined): Meeting | undefined;
}

/**
 * One compact line describing what someone is doing ("Working · #16178").
 * Presence is checked first: an offline person never shows a work activity.
 */
export function formatStatusLine(employee: Employee, lookups: StatusLookups, now: number = Date.now()): string {
  if (employee.presence.status === 'OFFLINE') {
    return `Offline · ${formatRelativeTime(employee.presence.lastSeenAt, now)}`;
  }

  const { activity } = employee;
  const workItem = lookups.workItem(activity.workItemId);
  const ref = workItem ? ` · #${workItem.externalId}` : '';

  switch (activity.type) {
    case 'AVAILABLE':
      return 'Available';
    case 'WORKING':
      return `Working${ref}`;
    case 'CODING':
      return `Coding${ref}`;
    case 'BLOCKED':
      return `Blocked${ref}`;
    case 'CODE_REVIEW': {
      const pullRequest = lookups.pullRequest(activity.pullRequestId);
      return pullRequest ? `Reviewing PR #${pullRequest.externalId}` : 'In code review';
    }
    case 'BUILDING': {
      const build = lookups.build(activity.buildId);
      return build ? `Build #${build.externalId} ${build.status === 'RUNNING' ? 'running' : build.status.toLowerCase()}` : 'Building';
    }
    case 'MEETING': {
      const meeting = lookups.meeting(employee.meeting?.meetingId);
      return meeting ? `In ${meeting.title}` : 'In a meeting';
    }
    case 'FOCUS':
      return 'Focus time';
    case 'BREAK':
      return activity.title ?? 'On a break';
    case 'OFFLINE':
      return 'Offline';
    default:
      return 'Status unknown';
  }
}
