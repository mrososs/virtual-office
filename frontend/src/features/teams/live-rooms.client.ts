import { SOCKET_EVENTS, type LiveRoomOccupancy, type MeetingRoomErrorPayload, type MeetingRoomSession, type UUID } from '@virtual-office/shared';

import { socketClient } from '@/core/socket';

/**
 * Live rooms over the office socket: which room my avatar is in, and the
 * Teams meeting attached to a meeting room. Payloads never name a person —
 * the server takes identity from the authenticated socket.
 */
export const liveRoomsClient = {
  reportRoom: (roomId: UUID | null): boolean => socketClient.emit(SOCKET_EVENTS.PLAYER_ROOM, { roomId }),
  setMeetingLink: (roomId: UUID, title: string, joinUrl: string): boolean => socketClient.emit(SOCKET_EVENTS.MEETING_ROOM_SET_LINK, { roomId, title, joinUrl }),
  clearMeeting: (roomId: UUID): boolean => socketClient.emit(SOCKET_EVENTS.MEETING_ROOM_CLEAR, { roomId }),
};

export interface LiveRoomsHandlers {
  onSnapshot(rooms: LiveRoomOccupancy[]): void;
  onRoom(room: LiveRoomOccupancy): void;
  onSessions(sessions: MeetingRoomSession[]): void;
  onSession(roomId: UUID, session: MeetingRoomSession | null): void;
  onError(error: MeetingRoomErrorPayload): void;
}

export function subscribeLiveRooms(handlers: LiveRoomsHandlers): () => void {
  const unsubscribers = [
    socketClient.on(SOCKET_EVENTS.ROOM_LIVE_SNAPSHOT, ({ rooms }) => handlers.onSnapshot(rooms)),
    socketClient.on(SOCKET_EVENTS.ROOM_LIVE_OCCUPANCY, (room) => handlers.onRoom(room)),
    socketClient.on(SOCKET_EVENTS.MEETING_ROOM_SESSIONS, ({ sessions }) => handlers.onSessions(sessions)),
    socketClient.on(SOCKET_EVENTS.MEETING_ROOM_SESSION_CHANGED, ({ roomId, session }) => handlers.onSession(roomId, session)),
    socketClient.on(SOCKET_EVENTS.MEETING_ROOM_ERROR, (error) => handlers.onError(error)),
  ];
  return () => {
    for (const unsubscribe of unsubscribers) unsubscribe();
  };
}
