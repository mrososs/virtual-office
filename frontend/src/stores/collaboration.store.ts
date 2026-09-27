import type { LiveRoomOccupancy, MeetingRoomSession, UUID } from '@virtual-office/shared';
import { defineStore } from 'pinia';

interface CollaborationStoreState {
  /** Who is in each room right now, as the server knows it (connected employees only). */
  liveOccupancy: Record<UUID, UUID[]>;
  /** Teams meetings attached to meeting rooms. */
  meetingSessions: Record<UUID, MeetingRoomSession>;
  /** Live rooms are known for the current connection. */
  synced: boolean;
  /** The last refused meeting-room request, shown next to its form. */
  meetingError: string | null;
}

/**
 * Server-authoritative room state behind the Teams features (collaboration
 * group calls, meeting-room links). Deliberately separate from the room
 * store's visual occupancy, which also counts scripted demo avatars.
 */
export const useCollaborationStore = defineStore('collaboration', {
  state: (): CollaborationStoreState => ({
    liveOccupancy: {},
    meetingSessions: {},
    synced: false,
    meetingError: null,
  }),

  getters: {
    occupantsOf: (state) => (roomId: UUID | null | undefined): UUID[] => (roomId ? (state.liveOccupancy[roomId] ?? []) : []),

    /** The room an employee is in right now, if connected. */
    liveRoomOf: (state) => (employeeId: UUID): UUID | null => {
      for (const [roomId, employeeIds] of Object.entries(state.liveOccupancy)) if (employeeIds.includes(employeeId)) return roomId;
      return null;
    },

    sessionOf: (state) => (roomId: UUID | null | undefined): MeetingRoomSession | null => (roomId ? (state.meetingSessions[roomId] ?? null) : null),
  },

  actions: {
    setSnapshot(rooms: LiveRoomOccupancy[]): void {
      this.liveOccupancy = Object.fromEntries(rooms.map((room) => [room.roomId, room.employeeIds]));
      this.synced = true;
    },

    setRoom(room: LiveRoomOccupancy): void {
      const next = { ...this.liveOccupancy };
      if (room.employeeIds.length > 0) next[room.roomId] = room.employeeIds;
      else delete next[room.roomId];
      this.liveOccupancy = next;
    },

    setSessions(sessions: MeetingRoomSession[]): void {
      this.meetingSessions = Object.fromEntries(sessions.map((session) => [session.roomId, session]));
    },

    setSession(roomId: UUID, session: MeetingRoomSession | null): void {
      const next = { ...this.meetingSessions };
      if (session) next[roomId] = session;
      else delete next[roomId];
      this.meetingSessions = next;
      this.meetingError = null;
    },

    /** Connection lost: occupancy is unknown until the next join snapshot. */
    markUnsynced(): void {
      this.synced = false;
      this.liveOccupancy = {};
    },
  },
});
