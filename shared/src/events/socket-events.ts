import type {
  Direction,
  EmployeeActivity,
  EmployeePresence,
  ISODateString,
  Meeting,
  BuildStatus,
  PlayerControlMode,
  PullRequestStatus,
  RoomOccupancy,
  UUID,
  Vector2,
} from '../types/index.js';

/**
 * Single source of truth for realtime event names. Import this instead of
 * writing string literals so frontend and backend can never drift apart.
 */
export const SOCKET_EVENTS = {
  OFFICE_JOIN: 'office:join',
  OFFICE_LEAVE: 'office:leave',

  PLAYER_MOVE: 'player:move',
  PLAYER_JOINED: 'player:joined',
  PLAYER_LEFT: 'player:left',
  PLAYER_POSITION: 'player:position',
  PLAYER_AUTO_MOVE: 'player:auto_move',

  EMPLOYEE_ACTIVITY_CHANGED: 'employee:activity_changed',
  EMPLOYEE_PRESENCE_CHANGED: 'employee:presence_changed',
  EMPLOYEE_ROOM_CHANGED: 'employee:room_changed',

  ROOM_OCCUPANCY_CHANGED: 'room:occupancy_changed',

  MEETING_SCHEDULED: 'meeting:scheduled',
  MEETING_STARTING_SOON: 'meeting:starting_soon',
  MEETING_STARTED: 'meeting:started',
  MEETING_ENDED: 'meeting:ended',
  MEETING_ROOM_ASSIGNED: 'meeting:room_assigned',

  WORKITEM_UPDATED: 'workitem:updated',
  PR_UPDATED: 'pr:updated',
  BUILD_UPDATED: 'build:updated',
} as const;

export type SocketEventName = (typeof SOCKET_EVENTS)[keyof typeof SOCKET_EVENTS];

/* ---------------------------------------------------------------------- */
/* Payloads                                                                */
/* ---------------------------------------------------------------------- */

export interface OfficeJoinPayload {
  officeId: UUID;
  employeeId: UUID;
  /** Where the joining avatar spawned, so peers can render it immediately. */
  position?: Vector2;
  direction?: Direction;
}

export interface OfficeLeavePayload {
  officeId: UUID;
  employeeId: UUID;
}

export interface PlayerMovePayload {
  employeeId: UUID;
  position: Vector2;
  direction: Direction;
}

export interface PlayerPositionBroadcast {
  employeeId: UUID;
  position: Vector2;
  direction: Direction;
  mode: PlayerControlMode;
}

export interface PlayerJoinedPayload {
  employeeId: UUID;
  position: Vector2;
  direction: Direction;
}

export interface PlayerLeftPayload {
  employeeId: UUID;
}

export interface PlayerAutoMovePayload {
  employeeId: UUID;
  targetRoomId: UUID;
  reason: 'MEETING' | 'BREAK' | 'CODE_REVIEW' | 'FOCUS' | 'SYSTEM';
}

export interface EmployeeActivityChangedPayload {
  employeeId: UUID;
  activity: EmployeeActivity;
}

export interface EmployeePresenceChangedPayload {
  employeeId: UUID;
  presence: EmployeePresence;
}

export interface EmployeeRoomChangedPayload {
  employeeId: UUID;
  roomId: UUID | null;
  roomType: string | null;
}

export interface RoomOccupancyChangedPayload extends RoomOccupancy {}

export interface MeetingLifecyclePayload {
  meeting: Meeting;
}

export interface MeetingStartingSoonPayload {
  meeting: Meeting;
  startsInSeconds: number;
}

export interface MeetingRoomAssignedPayload {
  meetingId: UUID;
  roomId: UUID;
}

export interface WorkItemUpdatedPayload {
  employeeId: UUID | null;
  workItemId: string;
  title: string;
  updatedAt: ISODateString;
}

export interface PullRequestUpdatedPayload {
  employeeId: UUID | null;
  pullRequestId: string;
  title: string;
  status: PullRequestStatus;
  updatedAt: ISODateString;
}

export interface BuildUpdatedPayload {
  buildId: string;
  status: BuildStatus;
  updatedAt: ISODateString;
}

/* ---------------------------------------------------------------------- */
/* socket.io typed maps                                                    */
/* ---------------------------------------------------------------------- */

export interface ServerToClientEvents {
  [SOCKET_EVENTS.PLAYER_JOINED]: (payload: PlayerJoinedPayload) => void;
  [SOCKET_EVENTS.PLAYER_LEFT]: (payload: PlayerLeftPayload) => void;
  [SOCKET_EVENTS.PLAYER_POSITION]: (payload: PlayerPositionBroadcast) => void;
  [SOCKET_EVENTS.PLAYER_AUTO_MOVE]: (payload: PlayerAutoMovePayload) => void;

  [SOCKET_EVENTS.EMPLOYEE_ACTIVITY_CHANGED]: (payload: EmployeeActivityChangedPayload) => void;
  [SOCKET_EVENTS.EMPLOYEE_PRESENCE_CHANGED]: (payload: EmployeePresenceChangedPayload) => void;
  [SOCKET_EVENTS.EMPLOYEE_ROOM_CHANGED]: (payload: EmployeeRoomChangedPayload) => void;

  [SOCKET_EVENTS.ROOM_OCCUPANCY_CHANGED]: (payload: RoomOccupancyChangedPayload) => void;

  [SOCKET_EVENTS.MEETING_SCHEDULED]: (payload: MeetingLifecyclePayload) => void;
  [SOCKET_EVENTS.MEETING_STARTING_SOON]: (payload: MeetingStartingSoonPayload) => void;
  [SOCKET_EVENTS.MEETING_STARTED]: (payload: MeetingLifecyclePayload) => void;
  [SOCKET_EVENTS.MEETING_ENDED]: (payload: MeetingLifecyclePayload) => void;
  [SOCKET_EVENTS.MEETING_ROOM_ASSIGNED]: (payload: MeetingRoomAssignedPayload) => void;

  [SOCKET_EVENTS.WORKITEM_UPDATED]: (payload: WorkItemUpdatedPayload) => void;
  [SOCKET_EVENTS.PR_UPDATED]: (payload: PullRequestUpdatedPayload) => void;
  [SOCKET_EVENTS.BUILD_UPDATED]: (payload: BuildUpdatedPayload) => void;
}

export interface ClientToServerEvents {
  [SOCKET_EVENTS.OFFICE_JOIN]: (payload: OfficeJoinPayload) => void;
  [SOCKET_EVENTS.OFFICE_LEAVE]: (payload: OfficeLeavePayload) => void;
  [SOCKET_EVENTS.PLAYER_MOVE]: (payload: PlayerMovePayload) => void;
}

export interface InterServerEvents {
  ping: () => void;
}

export interface SocketData {
  employeeId: UUID;
  organizationId: UUID;
  officeId: UUID;
}
