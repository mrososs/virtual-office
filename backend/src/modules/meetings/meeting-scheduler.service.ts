import { Injectable, Logger } from '@nestjs/common';
import type { Meeting, MeetingLifecyclePayload, MeetingStartingSoonPayload, UUID } from '@virtual-office/shared';
import { SOCKET_EVENTS } from '@virtual-office/shared';
import { MeetingRoomAllocator } from './meeting-room-allocator.service';

/**
 * Owns the meeting lifecycle clock: which upcoming meetings exist, which are
 * about to start, which are currently live — and publishes the
 * `meeting:*` realtime events so avatars can auto-walk to a meeting room
 * (see `PlayerAutoMovePayload` in the shared package) as a meeting nears.
 *
 * This service does not itself touch the Socket.IO server — it returns
 * payloads intended for `RealtimeModule`'s gateway to broadcast, keeping
 * scheduling logic independent of the transport.
 */
@Injectable()
export class MeetingSchedulerService {
  private readonly logger = new Logger(MeetingSchedulerService.name);

  /** How far ahead of `startAt` a meeting is considered "starting soon". */
  private static readonly STARTING_SOON_WINDOW_SECONDS = 5 * 60;

  constructor(private readonly roomAllocator: MeetingRoomAllocator) {}

  /**
   * Polls (or is triggered by) the calendar sync to find meetings scheduled
   * within a lookahead window for an organization.
   */
  async trackUpcomingMeetings(organizationId: UUID): Promise<Meeting[]> {
    // TODO: query MeetingsService for SCHEDULED meetings starting within the
    // next N hours for this organization.
    void organizationId;
    return [];
  }

  /** Meetings within `STARTING_SOON_WINDOW_SECONDS` of their `startAt`. */
  async identifyMeetingsStartingSoon(organizationId: UUID): Promise<MeetingStartingSoonPayload[]> {
    const upcoming = await this.trackUpcomingMeetings(organizationId);
    const now = Date.now();

    return upcoming
      .map((meeting) => ({
        meeting,
        startsInSeconds: Math.round((new Date(meeting.startAt).getTime() - now) / 1000),
      }))
      .filter(({ startsInSeconds }) => startsInSeconds >= 0 && startsInSeconds <= MeetingSchedulerService.STARTING_SOON_WINDOW_SECONDS);
  }

  /** Meetings whose window (`startAt`..`endAt`) contains "now". */
  async identifyLiveMeetings(organizationId: UUID): Promise<Meeting[]> {
    // TODO: query MeetingsService for meetings with status LIVE, or derive
    // from SCHEDULED meetings whose startAt <= now <= endAt.
    void organizationId;
    return [];
  }

  /**
   * Called when a meeting transitions to LIVE: allocates a room and returns
   * the lifecycle payload for `SOCKET_EVENTS.MEETING_STARTED` /
   * `SOCKET_EVENTS.MEETING_ROOM_ASSIGNED`.
   */
  async startMeeting(meeting: Meeting): Promise<MeetingLifecyclePayload> {
    const room = await this.roomAllocator.assignAttendees(
      meeting.organizationId,
      meeting.id,
      meeting.attendees.length,
    );

    this.logger.debug(
      `Meeting ${meeting.id} started${room ? ` in room ${room.id}` : ' (no room available)'}`,
    );

    // TODO: emit SOCKET_EVENTS.MEETING_STARTED and, if a room was assigned,
    // SOCKET_EVENTS.MEETING_ROOM_ASSIGNED via RealtimeModule. Also trigger
    // per-attendee PlayerAutoMovePayload broadcasts so avatars walk there.
    void SOCKET_EVENTS.MEETING_STARTED;

    return { meeting: { ...meeting, status: 'LIVE', roomId: room?.id ?? meeting.roomId } };
  }

  async endMeeting(meeting: Meeting): Promise<MeetingLifecyclePayload> {
    if (meeting.roomId) {
      await this.roomAllocator.releaseRoom(meeting.roomId);
    }

    // TODO: emit SOCKET_EVENTS.MEETING_ENDED via RealtimeModule.
    return { meeting: { ...meeting, status: 'ENDED', roomId: null } };
  }
}
