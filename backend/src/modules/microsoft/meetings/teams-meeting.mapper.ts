import { Injectable } from '@nestjs/common';
import type { Meeting, MeetingParticipant } from '@virtual-office/shared';
import { GraphOnlineMeeting } from './meeting.types';

/**
 * Converts a raw Microsoft Graph `onlineMeeting` resource into the shared
 * `Meeting` domain type. This mapper is the ONLY place allowed to know
 * about Graph's online-meeting shape — everything downstream only sees
 * `Meeting`.
 *
 * IMPORTANT: `Meeting.joinUrl` (Graph's `joinWebUrl`) is an opaque URL
 * supplied by Microsoft Graph. It is copied through verbatim here and must
 * never be constructed, parsed, or reformatted anywhere in this codebase.
 */
@Injectable()
export class TeamsMeetingMapper {
  toMeeting(organizationId: string, graphMeeting: GraphOnlineMeeting): Meeting {
    const attendees = [
      graphMeeting.participants.organizer,
      ...graphMeeting.participants.attendees,
    ];

    return {
      id: '', // TODO: resolve/assign our internal id.
      organizationId,
      externalProvider: 'TEAMS',
      externalMeetingId: graphMeeting.id,
      title: graphMeeting.subject ?? 'Untitled meeting',
      startAt: graphMeeting.startDateTime,
      endAt: graphMeeting.endDateTime,
      status: 'SCHEDULED',
      joinUrl: graphMeeting.joinWebUrl, // opaque — passed through as-is.
      attendees: attendees.map(
        (participant, index): MeetingParticipant => ({
          employeeId: null, // TODO: resolved by MeetingParticipantMapper, not here.
          externalEmail: participant.upn ?? '',
          displayName: participant.identity.user?.displayName ?? 'Unknown',
          responseStatus: index === 0 ? 'ORGANIZER' : 'NONE_RESPONDED',
          isOrganizer: index === 0,
        }),
      ),
      roomId: null,
    };
  }
}
