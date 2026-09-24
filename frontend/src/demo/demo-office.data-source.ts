import type { UUID } from '@virtual-office/shared';

import type { OfficeDataSource, OfficeSnapshot } from '@/features/office/data/office-data-source';

import { createDemoFeedHistory } from './activities.demo';
import { DEMO_AVATAR_APPEARANCES, DEMO_TEAMS, createDemoEmployees } from './employees.demo';
import { createDemoMeetings } from './meetings.demo';
import { createDemoOffice } from './office.demo';
import { createDemoBuilds, createDemoPullRequests, createDemoSprint, createDemoWorkItems } from './work.demo';

/** Builds a fresh demo company as of `now`. Called on first load and on every demo reset. */
export function createDemoSnapshot(now: number = Date.now()): OfficeSnapshot {
  const { office, floor, rooms, desks, map } = createDemoOffice();
  const meetings = createDemoMeetings(now);
  const meetingRoomById: Record<UUID, UUID | null> = Object.fromEntries(meetings.map((meeting) => [meeting.id, meeting.roomId]));

  return {
    organizationName: 'Acme Engineering',
    office,
    floor,
    map,
    rooms,
    desks,
    teams: DEMO_TEAMS,
    employees: createDemoEmployees(now, desks, meetingRoomById),
    avatarAppearances: DEMO_AVATAR_APPEARANCES,
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
