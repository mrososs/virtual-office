/**
 * Raw Microsoft Graph `event` resource shape (subset). This type — and any
 * other Graph-shaped type in this module — must never leak past
 * `calendar-event.mapper.ts`. Everything downstream of the mapper works
 * only with shared domain types (`Meeting`, `MeetingParticipant`).
 */
export interface GraphCalendarEvent {
  id: string;
  subject: string;
  start: { dateTime: string; timeZone: string };
  end: { dateTime: string; timeZone: string };
  isCancelled: boolean;
  onlineMeeting?: {
    joinUrl: string;
  } | null;
  attendees: GraphAttendee[];
  organizer: { emailAddress: { address: string; name: string } };
}

export interface GraphAttendee {
  emailAddress: { address: string; name: string };
  status: { response: 'none' | 'organizer' | 'tentativelyAccepted' | 'accepted' | 'declined'; time: string };
  type: 'required' | 'optional' | 'resource';
}
