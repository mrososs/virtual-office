import { Injectable } from '@nestjs/common';
import type { Meeting, MeetingParticipant, MeetingResponseStatus } from '@virtual-office/shared';
import { GraphAttendee, GraphCalendarEvent } from './calendar.types';

const RESPONSE_STATUS_MAP: Record<GraphAttendee['status']['response'], MeetingResponseStatus> = {
  none: 'NONE_RESPONDED',
  organizer: 'ORGANIZER',
  tentativelyAccepted: 'TENTATIVE',
  accepted: 'ACCEPTED',
  declined: 'DECLINED',
};

/**
 * Converts a raw Microsoft Graph calendar `event` into the shared `Meeting`
 * domain type. This mapper is the ONLY place allowed to know about Graph's
 * event shape — nothing past this point (MeetingsService, MeetingScheduler,
 * realtime broadcasts) should ever see a `GraphCalendarEvent`.
 */
@Injectable()
export class CalendarEventMapper {
  toMeeting(organizationId: string, event: GraphCalendarEvent): Meeting {
    return {
      id: '', // TODO: resolve/assign our internal id (new UUID or existing row lookup).
      organizationId,
      externalProvider: 'TEAMS',
      externalMeetingId: event.id,
      title: event.subject,
      startAt: event.start.dateTime,
      endAt: event.end.dateTime,
      status: event.isCancelled ? 'CANCELLED' : 'SCHEDULED',
      // Opaque URL from Graph — passed through as-is, never parsed/rebuilt.
      joinUrl: event.onlineMeeting?.joinUrl ?? null,
      attendees: event.attendees.map(
        (attendee): MeetingParticipant => ({
          employeeId: null, // TODO: resolved by MeetingParticipantMapper, not here.
          externalEmail: attendee.emailAddress.address,
          displayName: attendee.emailAddress.name,
          responseStatus: RESPONSE_STATUS_MAP[attendee.status.response],
          isOrganizer: false,
        }),
      ),
      roomId: null,
    };
  }
}
