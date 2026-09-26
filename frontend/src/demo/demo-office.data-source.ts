import { assignDesksByRole, type UUID } from '@virtual-office/shared';

import { COMPANY_BRANDING } from '@/core/config/branding';
import type { OfficeDataSource, OfficeSnapshot } from '@/features/office/data/office-data-source';
import { createHqFloorPlan } from '@/features/office/layout/hq-floor-plan';

import { createDemoFeedHistory } from './activities.demo';
import { DEMO_FLOOR_ID, DEMO_OFFICE_ID, DEMO_ORGANIZATION_ID } from './demo.ids';
import { createDemoAvatarProfiles } from './demo-avatar-profile.repository';
import { DEMO_DESK_ASSIGNEES, createDemoEmployees } from './employees.demo';
import { createDemoMeetings } from './meetings.demo';
import { createDemoBuilds, createDemoPullRequests, createDemoSprint, createDemoWorkItems } from './work.demo';

/** Builds a fresh demo company as of `now`. Called on first load and on every demo reset. */
export function createDemoSnapshot(now: number = Date.now()): OfficeSnapshot {
  const { office, floor, rooms, desks: unassignedDesks, map } = createHqFloorPlan({ organizationId: DEMO_ORGANIZATION_ID, officeId: DEMO_OFFICE_ID, floorId: DEMO_FLOOR_ID });
  // Role decides the work area: each person gets the first free desk there.
  const deskByEmployee = assignDesksByRole(DEMO_DESK_ASSIGNEES, unassignedDesks, rooms);
  const ownerByDesk = new Map([...deskByEmployee].map(([employeeId, deskId]) => [deskId, employeeId]));
  const desks = unassignedDesks.map((desk) => ({ ...desk, employeeId: ownerByDesk.get(desk.id) ?? null }));
  const meetings = createDemoMeetings(now);
  const meetingRoomById: Record<UUID, UUID | null> = Object.fromEntries(meetings.map((meeting) => [meeting.id, meeting.roomId]));

  return {
    organizationName: COMPANY_BRANDING.companyName,
    office,
    floor,
    map,
    rooms,
    desks,
    employees: createDemoEmployees(now, desks, meetingRoomById),
    avatarProfiles: createDemoAvatarProfiles(now),
    meetings,
    workItems: createDemoWorkItems(now),
    pullRequests: createDemoPullRequests(now),
    builds: createDemoBuilds(now),
    sprint: createDemoSprint(now),
    feed: createDemoFeedHistory(now),
  };
}

export const demoOfficeDataSource: OfficeDataSource = {
  kind: 'demo',
  async load() {
    return createDemoSnapshot();
  },
};
