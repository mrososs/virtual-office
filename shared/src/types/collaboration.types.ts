import type { ISODateString, UUID } from './common.types.js';

/**
 * Who is in a room right now, as the server knows it: connected employees
 * only (each reports the room its avatar is in; a closed tab removes them).
 * The source for Teams group calls and meeting-room participants.
 */
export interface LiveRoomOccupancy {
  roomId: UUID;
  employeeIds: UUID[];
}

/**
 * A Teams meeting attached to a Virtual Office meeting room. The link is one
 * a person pasted (validated server-side) — the office never creates, reads
 * or joins Teams meetings itself. Participants are whoever is in the room.
 */
export interface MeetingRoomSession {
  roomId: UUID;
  title: string;
  /** Normalized, allowlisted Teams join link. */
  teamsJoinUrl: string;
  createdBy: UUID;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

export type MeetingRoomErrorCode = 'NOT_IN_ROOM' | 'NOT_A_MEETING_ROOM' | 'INVALID_LINK' | 'INVALID_TITLE' | 'NOT_ALLOWED' | 'RATE_LIMITED';
