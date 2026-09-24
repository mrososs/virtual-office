import type { Meeting, MeetingParticipant, MeetingResponseStatus, UUID } from '@virtual-office/shared';

import { DEMO_ORGANIZATION_ID, EMP, MEETING, ROOM } from './demo.ids';

/** Seconds after demo start at which Frontend Daily goes live (the timeline uses the same constant). */
export const FRONTEND_DAILY_STARTS_AT_S = 40;

interface ParticipantSeed {
  employeeId: UUID | null;
  displayName: string;
  email: string;
  response: MeetingResponseStatus;
  organizer?: boolean;
}

const person = (employeeId: UUID, displayName: string, response: MeetingResponseStatus = 'ACCEPTED', organizer = false): ParticipantSeed => ({
  employeeId,
  displayName,
  email: `${displayName.toLowerCase().replace(/\s+/g, '.')}@acme.dev`,
  response: organizer ? 'ORGANIZER' : response,
  organizer,
});

const toParticipants = (seeds: ParticipantSeed[]): MeetingParticipant[] =>
  seeds.map((seed) => ({
    employeeId: seed.employeeId,
    externalEmail: seed.email,
    displayName: seed.displayName,
    responseStatus: seed.response,
    isOrganizer: seed.organizer ?? false,
  }));

/**
 * Microsoft Teams calendar events as they would look after
 * `CalendarEventMapper`/`TeamsMeetingMapper` ran. `joinUrl` is deliberately
 * null: we never invent Teams links — real ones come from Microsoft Graph.
 */
export function createDemoMeetings(now: number): Meeting[] {
  const minutes = (value: number) => new Date(now + value * 60_000).toISOString();
  const seconds = (value: number) => new Date(now + value * 1000).toISOString();
  const frontendDailyStart = now + FRONTEND_DAILY_STARTS_AT_S * 1000;

  return [
    {
      id: MEETING.frontendDaily,
      organizationId: DEMO_ORGANIZATION_ID,
      externalProvider: 'TEAMS',
      externalMeetingId: 'AAMkAGI2-demo-frontend-daily',
      title: 'Frontend Daily Standup',
      startAt: seconds(FRONTEND_DAILY_STARTS_AT_S),
      endAt: new Date(frontendDailyStart + 15 * 60_000).toISOString(),
      status: 'SCHEDULED',
      joinUrl: null,
      roomId: ROOM.meeting1,
      attendees: toParticipants([
        person(EMP.rana, 'Rana Mahmoud', 'ORGANIZER', true),
        person(EMP.mohamed, 'Mohamed Osama'),
        person(EMP.ahmed, 'Ahmed Hassan'),
        { employeeId: null, displayName: 'Lina Farouk (Contractor)', email: 'lina@pixelworks.studio', response: 'TENTATIVE' },
      ]),
    },
    {
      id: MEETING.designReview,
      organizationId: DEMO_ORGANIZATION_ID,
      externalProvider: 'TEAMS',
      externalMeetingId: 'AAMkAGI2-demo-design-review',
      title: 'Design Review',
      startAt: minutes(-10),
      endAt: minutes(35),
      status: 'LIVE',
      joinUrl: null,
      roomId: ROOM.meeting2,
      attendees: toParticipants([
        person(EMP.sara, 'Sara Ali', 'ORGANIZER', true),
        person(EMP.mariam, 'Mariam Adel'),
        person(EMP.nour, 'Nour Ahmed', 'TENTATIVE'),
      ]),
    },
    {
      id: MEETING.backendSync,
      organizationId: DEMO_ORGANIZATION_ID,
      externalProvider: 'TEAMS',
      externalMeetingId: 'AAMkAGI2-demo-backend-sync',
      title: 'Backend Sync',
      startAt: minutes(50),
      endAt: minutes(80),
      status: 'SCHEDULED',
      joinUrl: null,
      roomId: ROOM.meeting1,
      attendees: toParticipants([
        person(EMP.ahmed, 'Ahmed Hassan', 'ORGANIZER', true),
        person(EMP.youssef, 'Youssef Samir'),
        person(EMP.ali, 'Ali Mostafa', 'NONE_RESPONDED'),
      ]),
    },
    {
      id: MEETING.sprintPlanning,
      organizationId: DEMO_ORGANIZATION_ID,
      externalProvider: 'TEAMS',
      externalMeetingId: 'AAMkAGI2-demo-sprint-planning',
      title: 'Sprint 25 Planning',
      startAt: minutes(120),
      endAt: minutes(180),
      status: 'SCHEDULED',
      joinUrl: null,
      roomId: ROOM.meeting2,
      attendees: toParticipants([
        person(EMP.mariam, 'Mariam Adel', 'ORGANIZER', true),
        person(EMP.karim, 'Karim Tarek'),
        person(EMP.mohamed, 'Mohamed Osama'),
        person(EMP.ahmed, 'Ahmed Hassan'),
        person(EMP.youssef, 'Youssef Samir', 'TENTATIVE'),
        person(EMP.omar, 'Omar Khaled'),
        person(EMP.hana, 'Hana Yasser'),
        person(EMP.sara, 'Sara Ali'),
      ]),
    },
  ];
}
