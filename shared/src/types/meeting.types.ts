import type { ISODateString, UUID } from './common.types.js';

/**
 * Teams is the first provider, but the domain must not assume Microsoft is
 * the only possible backend — keep provider-specific data behind adapters.
 */
export type MeetingProvider = 'TEAMS' | 'GOOGLE_MEET' | 'ZOOM' | 'OTHER';

export type MeetingStatus =
  | 'SCHEDULED'
  | 'STARTING_SOON'
  | 'LIVE'
  | 'ENDED'
  | 'CANCELLED';

export type MeetingResponseStatus =
  | 'ACCEPTED'
  | 'TENTATIVE'
  | 'DECLINED'
  | 'NONE_RESPONDED'
  | 'ORGANIZER';

/**
 * A meeting attendee as known from the external calendar. `employeeId` is
 * nullable because not every attendee is necessarily a registered employee
 * in our system (external guests, distribution lists, etc).
 */
export interface MeetingParticipant {
  employeeId: UUID | null;
  externalEmail: string;
  displayName: string;
  responseStatus: MeetingResponseStatus;
  isOrganizer: boolean;
}

/**
 * Internal meeting domain model, independent from Microsoft Graph's shape.
 * Mappers in backend/microsoft/meetings translate Graph payloads into this.
 */
export interface Meeting {
  id: UUID;
  organizationId: UUID;

  externalProvider: MeetingProvider;
  externalMeetingId: string;

  title: string;
  startAt: ISODateString;
  endAt: ISODateString;
  status: MeetingStatus;

  /** Opaque external URL supplied by the provider API — never construct manually. */
  joinUrl: string | null;

  attendees: MeetingParticipant[];
  roomId: UUID | null;
}
