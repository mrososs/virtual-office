import type { ActivityType, Desk, Employee, EmployeeActivity, PresenceStatus, Team, UUID } from '@virtual-office/shared';

import type { AvatarAppearance } from '@/shared/utils/avatar-appearance';

import { BUILD, DEMO_ORGANIZATION_ID, EMP, MEETING, PULL_REQUEST, TEAM, WORK_ITEM } from './demo.ids';

export const DEMO_TEAMS: Team[] = [
  { id: TEAM.frontend, organizationId: DEMO_ORGANIZATION_ID, name: 'Frontend', managerEmployeeId: EMP.karim },
  { id: TEAM.backend, organizationId: DEMO_ORGANIZATION_ID, name: 'Backend', managerEmployeeId: EMP.karim },
  { id: TEAM.mobile, organizationId: DEMO_ORGANIZATION_ID, name: 'Mobile', managerEmployeeId: EMP.karim },
  { id: TEAM.design, organizationId: DEMO_ORGANIZATION_ID, name: 'Design', managerEmployeeId: EMP.mariam },
  { id: TEAM.quality, organizationId: DEMO_ORGANIZATION_ID, name: 'Quality', managerEmployeeId: EMP.karim },
  { id: TEAM.platform, organizationId: DEMO_ORGANIZATION_ID, name: 'Platform', managerEmployeeId: EMP.karim },
  { id: TEAM.product, organizationId: DEMO_ORGANIZATION_ID, name: 'Product', managerEmployeeId: null },
  { id: TEAM.leadership, organizationId: DEMO_ORGANIZATION_ID, name: 'Engineering Leadership', managerEmployeeId: null },
];

/** Curated looks so the cast reads as distinct people at a glance. */
export const DEMO_AVATAR_APPEARANCES: Record<UUID, Partial<AvatarAppearance>> = {
  [EMP.mohamed]: { shirt: '#6366f1', hairStyle: 'SHORT', hair: '#1c1714', skin: '#d39a70', pants: '#1e293b' },
  [EMP.ahmed]: { shirt: '#0ea5e9', hairStyle: 'BUZZ', hair: '#1c1714', skin: '#b97b52', pants: '#334155' },
  [EMP.sara]: { shirt: '#ec4899', hairStyle: 'LONG', hair: '#3a2a20', skin: '#eab993', pants: '#1e3a5f' },
  [EMP.omar]: { shirt: '#f97316', hairStyle: 'CURLY', hair: '#1c1714', skin: '#8e5a3a', pants: '#3f3f46' },
  [EMP.rana]: { shirt: '#14b8a6', hairStyle: 'WRAP', hair: '#7c3aed', skin: '#eab993', pants: '#1e293b' },
  [EMP.youssef]: { shirt: '#22c55e', hairStyle: 'SHORT', hair: '#5a3a22', skin: '#f6d2b8', pants: '#1e3a5f' },
  [EMP.mariam]: { shirt: '#8b5cf6', hairStyle: 'BUN', hair: '#1c1714', skin: '#d39a70', pants: '#44403c' },
  [EMP.karim]: { shirt: '#64748b', hairStyle: 'SHORT', hair: '#9aa1ab', skin: '#eab993', pants: '#1e293b' },
  [EMP.nour]: { shirt: '#f59e0b', hairStyle: 'BOB', hair: '#8a5a2c', skin: '#f6d2b8', pants: '#334155' },
  [EMP.ali]: { shirt: '#e11d48', hairStyle: 'CURLY', hair: '#1c1714', skin: '#65402a', pants: '#3f3f46' },
  [EMP.hana]: { shirt: '#10b981', hairStyle: 'WRAP', hair: '#1e3a5f', skin: '#b97b52', pants: '#44403c' },
  [EMP.tamer]: { shirt: '#3b82f6', hairStyle: 'BUZZ', hair: '#3a2a20', skin: '#8e5a3a', pants: '#1e293b' },
};

interface EmployeeSeed {
  id: UUID;
  displayName: string;
  jobTitle: string;
  teamId: UUID;
  presence: PresenceStatus;
  /** Minutes since last seen, for offline employees. */
  lastSeenMinutesAgo?: number;
  activity: Omit<EmployeeActivity, 'updatedAt' | 'confidence'> & { confidence?: number };
  meetingId?: UUID;
}

const activity = (type: ActivityType, rest: Partial<EmployeeActivity> = {}): EmployeeSeed['activity'] => ({
  type,
  source: rest.source ?? 'AZURE_DEVOPS',
  ...rest,
});

const EMPLOYEE_SEEDS: EmployeeSeed[] = [
  {
    id: EMP.mohamed,
    displayName: 'Mohamed Osama',
    jobTitle: 'Frontend Developer',
    teamId: TEAM.frontend,
    presence: 'ONLINE',
    activity: activity('WORKING', { title: 'Fix organization feature permissions', workItemId: WORK_ITEM.orgPermissions }),
  },
  {
    id: EMP.ahmed,
    displayName: 'Ahmed Hassan',
    jobTitle: 'Backend Developer',
    teamId: TEAM.backend,
    presence: 'ONLINE',
    activity: activity('CODING', { title: 'Dashboard filters for sprint health', workItemId: WORK_ITEM.dashboardFilters }),
  },
  {
    id: EMP.sara,
    displayName: 'Sara Ali',
    jobTitle: 'Product Designer',
    teamId: TEAM.design,
    presence: 'ONLINE',
    activity: activity('MEETING', { source: 'MICROSOFT_TEAMS', title: 'Design Review' }),
    meetingId: MEETING.designReview,
  },
  {
    id: EMP.omar,
    displayName: 'Omar Khaled',
    jobTitle: 'QA Engineer',
    teamId: TEAM.quality,
    presence: 'ONLINE',
    activity: activity('CODE_REVIEW', { title: 'Fix feature permission mapping', pullRequestId: PULL_REQUEST.permissionMapping }),
  },
  {
    id: EMP.rana,
    displayName: 'Rana Mahmoud',
    jobTitle: 'Frontend Developer',
    teamId: TEAM.frontend,
    presence: 'ONLINE',
    activity: activity('FOCUS', { source: 'MANUAL', title: 'Heads-down: accessible date picker' }),
  },
  {
    id: EMP.youssef,
    displayName: 'Youssef Samir',
    jobTitle: 'Backend Developer',
    teamId: TEAM.backend,
    presence: 'ONLINE',
    activity: activity('BUILDING', { title: 'Frontend CI', buildId: BUILD.frontendCi }),
  },
  {
    id: EMP.mariam,
    displayName: 'Mariam Adel',
    jobTitle: 'Product Manager',
    teamId: TEAM.product,
    presence: 'ONLINE',
    activity: activity('MEETING', { source: 'MICROSOFT_TEAMS', title: 'Design Review' }),
    meetingId: MEETING.designReview,
  },
  {
    id: EMP.karim,
    displayName: 'Karim Tarek',
    jobTitle: 'Engineering Manager',
    teamId: TEAM.leadership,
    presence: 'ONLINE',
    activity: activity('AVAILABLE', { source: 'SYSTEM' }),
  },
  {
    id: EMP.nour,
    displayName: 'Nour Ahmed',
    jobTitle: 'UX Designer',
    teamId: TEAM.design,
    presence: 'ONLINE',
    activity: activity('BREAK', { source: 'MANUAL', title: 'Ping-pong break' }),
  },
  {
    id: EMP.ali,
    displayName: 'Ali Mostafa',
    jobTitle: 'DevOps Engineer',
    teamId: TEAM.platform,
    presence: 'OFFLINE',
    lastSeenMinutesAgo: 35,
    activity: activity('OFFLINE', { source: 'SYSTEM' }),
  },
  {
    id: EMP.hana,
    displayName: 'Hana Yasser',
    jobTitle: 'QA Engineer',
    teamId: TEAM.quality,
    presence: 'ONLINE',
    activity: activity('WORKING', { title: 'Regression suite: organization settings', workItemId: WORK_ITEM.regressionSuite }),
  },
  {
    id: EMP.tamer,
    displayName: 'Tamer Nabil',
    jobTitle: 'Mobile Developer',
    teamId: TEAM.mobile,
    presence: 'ONLINE',
    activity: activity('BLOCKED', { title: 'iOS push notifications drop after token refresh', workItemId: WORK_ITEM.iosPush }),
  },
];

export interface DemoIdentity {
  employeeId: UUID;
  displayName: string;
  jobTitle: string;
}

/** Everyone you can sign in as in demo mode (one identity per browser tab). */
export const DEMO_IDENTITIES: DemoIdentity[] = EMPLOYEE_SEEDS.map(({ id, displayName, jobTitle }) => ({ employeeId: id, displayName, jobTitle }));

export function createDemoEmployees(now: number, desks: Desk[], meetingRoomById: Record<UUID, UUID | null>): Employee[] {
  const iso = new Date(now).toISOString();

  return EMPLOYEE_SEEDS.map((seed) => {
    const desk = desks.find((candidate) => candidate.employeeId === seed.id) ?? null;
    const lastSeenAt =
      seed.presence === 'OFFLINE'
        ? new Date(now - (seed.lastSeenMinutesAgo ?? 60) * 60_000).toISOString()
        : iso;

    return {
      id: seed.id,
      organizationId: DEMO_ORGANIZATION_ID,
      displayName: seed.displayName,
      email: `${seed.displayName.toLowerCase().replace(/\s+/g, '.')}@acme.dev`,
      avatarUrl: null,
      jobTitle: seed.jobTitle,
      teamId: seed.teamId,
      position: desk ? { x: desk.position.x, y: desk.position.y, direction: 'down' } : { x: 0, y: 0, direction: 'down' },
      assignedDesk: desk ? { deskId: desk.id, x: desk.position.x, y: desk.position.y } : null,
      presence: { status: seed.presence, lastSeenAt, connectedSocketId: null },
      activity: { confidence: 0.8, ...seed.activity, updatedAt: iso },
      room: { roomId: null, roomType: null },
      meeting: seed.meetingId ? { meetingId: seed.meetingId, roomId: meetingRoomById[seed.meetingId] ?? null } : null,
    };
  });
}

