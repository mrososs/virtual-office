import type { Meeting, MeetingStatus, UUID } from '@virtual-office/shared';
import { defineStore } from 'pinia';

interface MeetingStoreState {
  meetingsById: Record<UUID, Meeting>;
}

const ACTIVE_STATUSES: readonly MeetingStatus[] = ['LIVE', 'STARTING_SOON'];

export const useMeetingStore = defineStore('meeting', {
  state: (): MeetingStoreState => ({
    meetingsById: {},
  }),

  getters: {
    all: (state): Meeting[] =>
      Object.values(state.meetingsById).sort((a, b) => a.startAt.localeCompare(b.startAt)),
    byId:
      (state) =>
      (id: UUID): Meeting | undefined =>
        state.meetingsById[id],
    liveCount: (state): number => Object.values(state.meetingsById).filter((meeting) => meeting.status === 'LIVE').length,
    /** The meeting a room should advertise right now: LIVE wins over STARTING_SOON. */
    currentForRoom:
      (state) =>
      (roomId: UUID): Meeting | undefined => {
        const candidates = Object.values(state.meetingsById).filter(
          (meeting) => meeting.roomId === roomId && ACTIVE_STATUSES.includes(meeting.status),
        );
        return candidates.find((meeting) => meeting.status === 'LIVE') ?? candidates[0];
      },
  },

  actions: {
    setMeetings(meetings: Meeting[]): void {
      this.meetingsById = Object.fromEntries(meetings.map((meeting) => [meeting.id, meeting]));
    },

    setStatus(meetingId: UUID, status: MeetingStatus): void {
      const meeting = this.meetingsById[meetingId];
      if (meeting) meeting.status = status;
    },

    reschedule(meetingId: UUID, update: Pick<Meeting, 'startAt' | 'endAt' | 'roomId'>): void {
      const meeting = this.meetingsById[meetingId];
      if (!meeting) return;
      meeting.startAt = update.startAt;
      meeting.endAt = update.endAt;
      meeting.roomId = update.roomId;
    },
  },
});
