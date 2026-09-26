import type {
  ActivityType,
  AvatarAppearance,
  Desk,
  Employee,
  EmployeeActivity,
  EmployeeRole,
  PresenceStatus,
  UUID,
} from '@virtual-office/shared';

import { BUILD, DEMO_ORGANIZATION_ID, EMP, MEETING, PULL_REQUEST, WORK_ITEM, demoEmailFor } from './demo.ids';

/**
 * Each teammate's saved look. Chosen per person, never per role — the
 * General Manager customizes with exactly the same options as a developer.
 * These stand in for avatars people already created; the signed-in demo
 * user still goes through the avatar creator on their first visit.
 */
export const DEMO_AVATAR_LOOKS: Readonly<Record<UUID, AvatarAppearance>> = {
  [EMP.karim]: { bodyType: 'body-broad', skinTone: 'skin-03', hairStyle: 'hair-short', hairColor: 'silver', topStyle: 'top-sweater', topColor: 'slate', bottomStyle: 'bottom-pants', bottomColor: 'charcoal', shoesStyle: 'shoes-classic', accessory: 'acc-glasses-square' },
  [EMP.mariam]: { bodyType: 'body-slim', skinTone: 'skin-04', hairStyle: 'hair-wrap', hairColor: 'plum', topStyle: 'top-blazer', topColor: 'violet', bottomStyle: 'bottom-skirt', bottomColor: 'charcoal', shoesStyle: 'shoes-classic', accessory: 'acc-lanyard' },
  [EMP.mohamed]: { bodyType: 'body-regular', skinTone: 'skin-04', hairStyle: 'hair-short', hairColor: 'black', topStyle: 'top-tshirt', topColor: 'indigo', bottomStyle: 'bottom-jeans', bottomColor: 'denim', shoesStyle: 'shoes-sneakers', accessory: null },
  [EMP.ahmed]: { bodyType: 'body-regular', skinTone: 'skin-05', hairStyle: 'hair-buzz', hairColor: 'black', topStyle: 'top-hoodie', topColor: 'sky', bottomStyle: 'bottom-joggers', bottomColor: 'black', shoesStyle: 'shoes-sneakers', accessory: 'acc-headphones' },
  [EMP.rana]: { bodyType: 'body-slim', skinTone: 'skin-02', hairStyle: 'hair-long', hairColor: 'auburn', topStyle: 'top-shirt', topColor: 'teal', bottomStyle: 'bottom-jeans', bottomColor: 'navy', shoesStyle: 'shoes-canvas', accessory: null },
  [EMP.youssef]: { bodyType: 'body-regular', skinTone: 'skin-01', hairStyle: 'hair-curly', hairColor: 'brown', topStyle: 'top-polo', topColor: 'green', bottomStyle: 'bottom-pants', bottomColor: 'khaki', shoesStyle: 'shoes-classic', accessory: null },
  [EMP.omar]: { bodyType: 'body-broad', skinTone: 'skin-06', hairStyle: 'hair-curly', hairColor: 'black', topStyle: 'top-hoodie', topColor: 'orange', bottomStyle: 'bottom-jeans', bottomColor: 'denim', shoesStyle: 'shoes-boots', accessory: 'acc-glasses-round' },
  [EMP.tamer]: { bodyType: 'body-slim', skinTone: 'skin-07', hairStyle: 'hair-short', hairColor: 'espresso', topStyle: 'top-tshirt', topColor: 'red', bottomStyle: 'bottom-shorts', bottomColor: 'olive', shoesStyle: 'shoes-sneakers', accessory: 'acc-sunglasses' },
  [EMP.sara]: { bodyType: 'body-regular', skinTone: 'skin-03', hairStyle: 'hair-ponytail', hairColor: 'blonde', topStyle: 'top-sweater', topColor: 'pink', bottomStyle: 'bottom-skirt', bottomColor: 'navy', shoesStyle: 'shoes-classic', accessory: null },
  [EMP.nour]: { bodyType: 'body-slim', skinTone: 'skin-05', hairStyle: 'hair-bob', hairColor: 'espresso', topStyle: 'top-polo', topColor: 'amber', bottomStyle: 'bottom-pants', bottomColor: 'stone', shoesStyle: 'shoes-canvas', accessory: 'acc-glasses-round' },
  [EMP.ali]: { bodyType: 'body-regular', skinTone: 'skin-08', hairStyle: 'hair-shaved', hairColor: 'black', topStyle: 'top-shirt', topColor: 'white', bottomStyle: 'bottom-pants', bottomColor: 'navy', shoesStyle: 'shoes-boots', accessory: 'acc-lanyard' },
};

interface EmployeeSeed {
  id: UUID;
  displayName: string;
  role: EmployeeRole;
  jobTitle: string;
  team: string;
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

/** Seed order matters: desks are assigned by role in this order (see `assignDesksByRole`). */
const EMPLOYEE_SEEDS: EmployeeSeed[] = [
  {
    id: EMP.karim,
    displayName: 'Karim Tarek',
    role: 'GENERAL_MANAGER',
    jobTitle: 'General Manager',
    team: 'Management',
    presence: 'ONLINE',
    activity: activity('AVAILABLE', { source: 'SYSTEM' }),
  },
  {
    id: EMP.mariam,
    displayName: 'Mariam Adel',
    role: 'PROJECT_MANAGER',
    jobTitle: 'Project Manager',
    team: 'Project Management',
    presence: 'ONLINE',
    activity: activity('MEETING', { source: 'MICROSOFT_TEAMS', title: 'Release Readiness Review' }),
    meetingId: MEETING.releaseReview,
  },
  {
    id: EMP.mohamed,
    displayName: 'Mohamed Osama',
    role: 'TEAM_LEAD',
    jobTitle: 'Developer / Team Lead',
    team: 'Development',
    presence: 'ONLINE',
    activity: activity('WORKING', { title: 'Fix organization feature permissions', workItemId: WORK_ITEM.orgPermissions }),
  },
  {
    id: EMP.ahmed,
    displayName: 'Ahmed Hassan',
    role: 'DEVELOPER',
    jobTitle: 'Developer',
    team: 'Development',
    presence: 'ONLINE',
    activity: activity('CODING', { title: 'Dashboard filters for sprint health', workItemId: WORK_ITEM.dashboardFilters }),
  },
  {
    id: EMP.rana,
    displayName: 'Rana Mahmoud',
    role: 'DEVELOPER',
    jobTitle: 'UX/UI Designer',
    team: 'Design',
    presence: 'ONLINE',
    activity: activity('BREAK', { source: 'MANUAL', title: 'Ping-pong break' }),
  },
  {
    id: EMP.youssef,
    displayName: 'Youssef Samir',
    role: 'DEVELOPER',
    jobTitle: 'Developer',
    team: 'Development',
    presence: 'ONLINE',
    activity: activity('BUILDING', { title: 'Frontend CI', buildId: BUILD.frontendCi }),
  },
  {
    id: EMP.omar,
    displayName: 'Omar Khaled',
    role: 'DEVELOPER',
    jobTitle: 'Developer',
    team: 'Development',
    presence: 'ONLINE',
    activity: activity('CODE_REVIEW', { title: 'Fix feature permission mapping', pullRequestId: PULL_REQUEST.permissionMapping }),
  },
  {
    id: EMP.tamer,
    displayName: 'Tamer Nabil',
    role: 'DEVELOPER',
    jobTitle: 'Mobile Flutter Developer',
    team: 'Mobile Development',
    presence: 'ONLINE',
    activity: activity('BLOCKED', { title: 'iOS push notifications drop after token refresh', workItemId: WORK_ITEM.iosPush }),
  },
  {
    id: EMP.sara,
    displayName: 'Sara Ali',
    role: 'QA',
    jobTitle: 'QA Engineer',
    team: 'QA',
    presence: 'ONLINE',
    activity: activity('MEETING', { source: 'MICROSOFT_TEAMS', title: 'Release Readiness Review' }),
    meetingId: MEETING.releaseReview,
  },
  {
    id: EMP.nour,
    displayName: 'Nour Ahmed',
    role: 'QA',
    jobTitle: 'QA Engineer',
    team: 'QA',
    presence: 'ONLINE',
    activity: activity('TESTING', { title: 'Regression suite: organization settings', workItemId: WORK_ITEM.regressionSuite }),
  },
  {
    id: EMP.ali,
    displayName: 'Ali Mostafa',
    role: 'QA',
    jobTitle: 'QA Engineer',
    team: 'QA',
    presence: 'OFFLINE',
    lastSeenMinutesAgo: 35,
    activity: activity('OFFLINE', { source: 'SYSTEM' }),
  },
];

/** Who needs a desk, in assignment order. */
export const DEMO_DESK_ASSIGNEES = EMPLOYEE_SEEDS.map(({ id, role }) => ({ id, role }));

export interface DemoIdentity {
  employeeId: UUID;
  displayName: string;
  role: EmployeeRole;
  jobTitle: string;
  team: string;
}

/** Everyone you can sign in as in demo mode (one identity per browser tab). */
export const DEMO_IDENTITIES: DemoIdentity[] = EMPLOYEE_SEEDS.map(({ id, displayName, role, jobTitle, team }) => ({ employeeId: id, displayName, role, jobTitle, team }));

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
      email: demoEmailFor(seed.displayName),
      role: seed.role,
      jobTitle: seed.jobTitle,
      team: seed.team,
      position: desk ? { x: desk.position.x, y: desk.position.y, direction: 'down' } : { x: 0, y: 0, direction: 'down' },
      assignedDesk: desk ? { deskId: desk.id, x: desk.position.x, y: desk.position.y } : null,
      presence: { status: seed.presence, lastSeenAt, connectedSocketId: null },
      activity: { confidence: 0.8, ...seed.activity, updatedAt: iso },
      room: { roomId: null, roomType: null },
      meeting: seed.meetingId ? { meetingId: seed.meetingId, roomId: meetingRoomById[seed.meetingId] ?? null } : null,
    };
  });
}
