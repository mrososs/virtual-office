/**
 * Raw Microsoft Graph `onlineMeeting` resource shape (subset), as returned
 * by the `/me/onlineMeetings` or `/communications/onlineMeetings` endpoints.
 * Like `calendar/calendar.types.ts`, this must never leak past
 * `teams-meeting.mapper.ts`.
 */
export interface GraphOnlineMeeting {
  id: string;
  subject: string | null;
  startDateTime: string;
  endDateTime: string;
  joinWebUrl: string;
  participants: {
    organizer: GraphOnlineMeetingParticipant;
    attendees: GraphOnlineMeetingParticipant[];
  };
}

export interface GraphOnlineMeetingParticipant {
  identity: {
    user?: { id: string; displayName: string };
  };
  upn?: string;
}
