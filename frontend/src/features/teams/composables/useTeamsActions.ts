import {
  checkTeamsMeetingUrl,
  createCallLink,
  createChatLink,
  createGroupCallLink,
  createMeetingScheduleLink,
  sanitizeMeetingTitle,
  teamsIdentityOf,
  type Employee,
  type UUID,
} from '@virtual-office/shared';

import { useAuthStore } from '@/stores/auth.store';
import { useCollaborationStore } from '@/stores/collaboration.store';
import { useEmployeeStore } from '@/stores/employee.store';
import { useRoomStore } from '@/stores/room.store';

import { liveRoomsClient } from '../live-rooms.client';

/**
 * Every Teams action in the office. Links come from the shared Teams
 * deep-link helpers only, built from employees' work emails (no Teams setup,
 * tokens or Graph). Room actions use the server's live occupancy, never what
 * this browser happens to render. Links open in a new tab with no opener and
 * no referrer; Teams asks before placing any call, and nothing is sent or
 * dialled automatically.
 */
export function useTeamsActions() {
  const employeeStore = useEmployeeStore();
  const collaborationStore = useCollaborationStore();
  const roomStore = useRoomStore();
  const authStore = useAuthStore();

  const identityOf = (employeeId: UUID): string | null => {
    const employee = employeeStore.byId(employeeId);
    return employee ? teamsIdentityOf(employee) : null;
  };

  /** Everyone else in the room right now (server occupancy), as employees. */
  function othersIn(roomId: UUID): Employee[] {
    return collaborationStore
      .occupantsOf(roomId)
      .filter((id) => id !== authStore.currentEmployeeId)
      .map((id) => employeeStore.byId(id))
      .filter((employee): employee is Employee => employee !== undefined);
  }

  /** Teams identities of everyone else in the room; people without a valid work email are left out. */
  function identitiesIn(roomId: UUID): string[] {
    return othersIn(roomId)
      .map((employee) => teamsIdentityOf(employee))
      .filter((identity): identity is string => identity !== null);
  }

  function open(link: string | null): boolean {
    if (!link) return false;
    window.open(link, '_blank', 'noopener,noreferrer');
    return true;
  }

  return {
    identityOf,
    othersIn,
    identitiesIn,
    chatWith: (employeeId: UUID) => open(createChatLink([identityOf(employeeId) ?? ''])),
    callEmployee: (employeeId: UUID) => open(createCallLink(identityOf(employeeId) ?? '')),
    startGroupCall: (roomId: UUID) => open(createGroupCallLink(identitiesIn(roomId))),
    openGroupChat: (roomId: UUID) => open(createChatLink(identitiesIn(roomId), { topicName: roomStore.byId(roomId)?.name })),

    /** Teams' own new-meeting form, pre-filled with the people in the room, starting at the next quarter hour. */
    scheduleMeeting(roomId: UUID, subject: string): boolean {
      const start = new Date();
      start.setSeconds(0, 0);
      start.setMinutes(Math.ceil((start.getMinutes() + 1) / 15) * 15);
      const room = roomStore.byId(roomId)?.name ?? 'the meeting room';
      return open(
        createMeetingScheduleLink({
          subject: subject.trim() || `Meeting in ${room}`,
          attendees: identitiesIn(roomId),
          start,
          end: new Date(start.getTime() + 30 * 60_000),
          content: `Virtual Office · ${room}. To share this meeting in the office, paste its Teams link into the room afterwards.`,
        }),
      );
    },

    joinMeeting(roomId: UUID): boolean {
      const url = collaborationStore.sessionOf(roomId)?.teamsJoinUrl;
      // Stored links were validated by the server; check again before opening anyway.
      const check = checkTeamsMeetingUrl(url);
      return open(check.ok ? check.url : null);
    },

    /** Checked here for instant feedback; the server repeats the check and decides. */
    attachMeeting(roomId: UUID, title: string, joinUrl: string): boolean {
      const cleanTitle = sanitizeMeetingTitle(title);
      if (!cleanTitle) {
        collaborationStore.meetingError = 'Give the meeting a short title (up to 80 characters).';
        return false;
      }
      const check = checkTeamsMeetingUrl(joinUrl);
      if (!check.ok) {
        collaborationStore.meetingError = check.reason;
        return false;
      }
      collaborationStore.meetingError = null;
      return liveRoomsClient.setMeetingLink(roomId, cleanTitle, check.url);
    },

    endMeeting: (roomId: UUID) => liveRoomsClient.clearMeeting(roomId),
  };
}
