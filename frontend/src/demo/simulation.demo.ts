import type {
  ActivityType,
  BuildStatus,
  EmployeeActivity,
  MeetingStatus,
  PresenceStatus,
  PullRequestStatus,
  UUID,
  WorkItemState,
} from '@virtual-office/shared';

import { BUILD, EMP, MEETING, PULL_REQUEST, WORK_ITEM } from './demo.ids';
import { TEAM_DAILY_STARTS_AT_S } from './meetings.demo';

/**
 * The demo is a deterministic script of *domain* mutations. It never touches
 * Phaser or avatars: moving people is the office director's job, derived
 * from the resulting activity/meeting state like real integration events.
 */
export type DemoActivity = Pick<EmployeeActivity, 'type' | 'source'> &
  Partial<Pick<EmployeeActivity, 'title' | 'workItemId' | 'pullRequestId' | 'buildId'>>;

export type DemoAction =
  | { type: 'ACTIVITY'; employeeId: UUID; activity: DemoActivity; meetingId?: UUID | null }
  | { type: 'PRESENCE'; employeeId: UUID; status: PresenceStatus }
  | { type: 'MEETING'; meetingId: UUID; status: MeetingStatus }
  | { type: 'BUILD'; buildId: UUID; status: BuildStatus }
  | { type: 'PULL_REQUEST'; pullRequestId: UUID; status: PullRequestStatus }
  | { type: 'WORK_ITEM'; workItemId: UUID; state: WorkItemState };

export interface DemoTimelineStep {
  /** Seconds after the cycle started. */
  at: number;
  label: string;
  actions: DemoAction[];
}

const act = (
  employeeId: UUID,
  type: ActivityType,
  details: Omit<DemoActivity, 'type' | 'source'> & { source?: DemoActivity['source']; meetingId?: UUID } = {},
): DemoAction => {
  const { meetingId, source, ...rest } = details;
  return {
    type: 'ACTIVITY',
    employeeId,
    activity: { type, source: source ?? (type === 'MEETING' ? 'MICROSOFT_TEAMS' : 'AZURE_DEVOPS'), ...rest },
    meetingId: meetingId ?? null,
  };
};

export const DEMO_TIMELINE: DemoTimelineStep[] = [
  {
    at: 8,
    label: 'Team Daily is starting soon',
    actions: [{ type: 'MEETING', meetingId: MEETING.teamDaily, status: 'STARTING_SOON' }],
  },
  {
    at: 12,
    label: 'Rana heads to Meeting Room 1',
    actions: [act(EMP.rana, 'MEETING', { title: 'Team Daily Standup', meetingId: MEETING.teamDaily })],
  },
  {
    at: 17,
    label: 'Ahmed heads to Meeting Room 1',
    actions: [act(EMP.ahmed, 'MEETING', { title: 'Team Daily Standup', meetingId: MEETING.teamDaily })],
  },
  {
    at: TEAM_DAILY_STARTS_AT_S,
    label: 'Team Daily is live',
    actions: [
      { type: 'MEETING', meetingId: MEETING.teamDaily, status: 'LIVE' },
      act(EMP.mohamed, 'MEETING', { title: 'Team Daily Standup', meetingId: MEETING.teamDaily }),
    ],
  },
  {
    at: 48,
    label: 'Build #245 passes',
    actions: [
      { type: 'BUILD', buildId: BUILD.frontendCi, status: 'SUCCEEDED' },
      { type: 'WORK_ITEM', workItemId: WORK_ITEM.pipelineCaching, state: 'ACTIVE' },
      act(EMP.youssef, 'WORKING', { title: 'Cache pipeline dependencies', workItemId: WORK_ITEM.pipelineCaching }),
    ],
  },
  {
    at: 58,
    label: 'Nour joins the release review',
    actions: [act(EMP.nour, 'MEETING', { title: 'Release Readiness Review', meetingId: MEETING.releaseReview })],
  },
  {
    at: 70,
    label: 'Omar approves PR #493',
    actions: [
      { type: 'PULL_REQUEST', pullRequestId: PULL_REQUEST.permissionMapping, status: 'APPROVED' },
      act(EMP.omar, 'CODING', { title: 'Design tokens v2', workItemId: WORK_ITEM.designTokens }),
    ],
  },
  {
    at: 80,
    label: 'Youssef takes a coffee break',
    actions: [act(EMP.youssef, 'BREAK', { source: 'MANUAL', title: 'Coffee break' })],
  },
  {
    at: 86,
    label: 'PR #498 is ready for review',
    actions: [
      { type: 'PULL_REQUEST', pullRequestId: PULL_REQUEST.tenantSettingsApi, status: 'ACTIVE' },
      { type: 'BUILD', buildId: BUILD.backendCi, status: 'RUNNING' },
      act(EMP.omar, 'CODE_REVIEW', { title: 'Tenant settings API', pullRequestId: PULL_REQUEST.tenantSettingsApi }),
    ],
  },
  {
    at: 96,
    label: 'Karim grabs a coffee',
    actions: [act(EMP.karim, 'BREAK', { source: 'MANUAL', title: 'Coffee break' })],
  },
  {
    at: 110,
    label: 'Team Daily ends',
    actions: [
      { type: 'MEETING', meetingId: MEETING.teamDaily, status: 'ENDED' },
      act(EMP.rana, 'CODING', { title: 'Accessible date picker', workItemId: WORK_ITEM.datePicker }),
      act(EMP.ahmed, 'CODING', { title: 'Dashboard filters for sprint health', workItemId: WORK_ITEM.dashboardFilters }),
      act(EMP.mohamed, 'WORKING', { title: 'Fix organization feature permissions', workItemId: WORK_ITEM.orgPermissions }),
    ],
  },
  {
    at: 122,
    label: 'Build #246 passes',
    actions: [{ type: 'BUILD', buildId: BUILD.backendCi, status: 'SUCCEEDED' }],
  },
  {
    at: 125,
    label: 'Youssef is back at his desk',
    actions: [act(EMP.youssef, 'WORKING', { title: 'Cache pipeline dependencies', workItemId: WORK_ITEM.pipelineCaching })],
  },
  {
    at: 132,
    label: 'Release review wraps up',
    actions: [
      { type: 'MEETING', meetingId: MEETING.releaseReview, status: 'ENDED' },
      act(EMP.sara, 'TESTING', { title: 'Test plan: feature permissions', workItemId: WORK_ITEM.testPlan }),
      act(EMP.nour, 'TESTING', { title: 'Regression suite: organization settings', workItemId: WORK_ITEM.regressionSuite }),
      act(EMP.mariam, 'AVAILABLE', { source: 'SYSTEM' }),
    ],
  },
  {
    at: 140,
    label: 'Omar approves PR #498',
    actions: [
      { type: 'PULL_REQUEST', pullRequestId: PULL_REQUEST.tenantSettingsApi, status: 'APPROVED' },
      act(EMP.omar, 'CODING', { title: 'Design tokens v2', workItemId: WORK_ITEM.designTokens }),
    ],
  },
  {
    at: 147,
    label: 'Karim is back',
    actions: [act(EMP.karim, 'AVAILABLE', { source: 'SYSTEM' })],
  },
  {
    at: 153,
    label: 'Rana goes heads-down',
    actions: [act(EMP.rana, 'FOCUS', { source: 'MANUAL', title: 'Heads-down: accessible date picker' })],
  },
  {
    at: 160,
    label: 'Tamer is unblocked',
    actions: [
      { type: 'WORK_ITEM', workItemId: WORK_ITEM.iosPush, state: 'ACTIVE' },
      act(EMP.tamer, 'CODING', { title: 'iOS push notifications drop after token refresh', workItemId: WORK_ITEM.iosPush }),
    ],
  },
];

/** Idle time after the last step before a looping demo starts its next cycle. */
export const DEMO_CYCLE_PAUSE_S = 20;

export const DEMO_CYCLE_LENGTH_S = (DEMO_TIMELINE[DEMO_TIMELINE.length - 1]?.at ?? 0) + DEMO_CYCLE_PAUSE_S;
