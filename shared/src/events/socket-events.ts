import type {
  AvatarProfile,
  Direction,
  EmployeeActivity,
  EmployeePresence,
  GameErrorCode,
  GameSession,
  GameStationState,
  ISODateString,
  Meeting,
  BuildStatus,
  PlayerControlMode,
  PongInput,
  PongState,
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
  /** Client → server: my saved avatar changed. */
  PLAYER_AVATAR_UPDATE: 'player:avatar_update',
  /** Server → other clients: re-skin this person's avatar. */
  PLAYER_AVATAR_UPDATED: 'player:avatar_updated',

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
  /** Server → clients: a fresh Azure DevOps sync is stored; refetch work data over HTTP. */
  WORK_SYNCED: 'work:synced',

  /** Server → one client: its session was signed out or expired; the socket closes right after. */
  SESSION_ENDED: 'session:ended',

  /* Game Room — identity always comes from the authenticated socket, never from a payload. */
  /** Client → server: send me every station and my current match (after each (re)connect). */
  GAME_SYNC: 'game:sync',
  GAME_JOIN_TABLE: 'game:join_table',
  GAME_LEAVE_TABLE: 'game:leave_table',
  /** Client → server (host of an external game): the room link or code they created on the provider's site. */
  GAME_SHARE_ROOM: 'game:share_room',
  /** Client → server (internal Pong only): Start (match found) or Rematch (match over). */
  GAME_READY: 'game:ready',
  /** Client → server (internal Pong only): paddle direction, on change plus a slow heartbeat. */
  GAME_INPUT: 'game:input',
  /** Server → one client: every station (reply to game:sync). */
  GAME_STATIONS: 'game:stations',
  /** Server → office: one station's occupancy changed. */
  GAME_STATION_UPDATED: 'game:station_updated',
  /** Server → the players: their match changed (found, countdown, score, paused, over), or null = no match. */
  GAME_SESSION: 'game:session',
  /** Server → the players (internal Pong only): authoritative ball and paddle snapshot while playing. */
  GAME_STATE: 'game:state',
  /** Server → one employee: a game request was refused, or they were released from a table. */
  GAME_ERROR: 'game:error',
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
  /** The joiner's saved look, sent once here instead of with every movement packet. */
  avatar?: AvatarProfile | null;
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
  /** Null when the person has no saved avatar yet (render the default look). */
  avatar: AvatarProfile | null;
}

/**
 * Avatar changes travel separately from movement: sent on change only, never
 * attached to `player:move` / `player:position`, which stay tiny.
 */
export interface PlayerAvatarUpdatedPayload {
  employeeId: UUID;
  avatar: AvatarProfile;
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

export interface WorkSyncedPayload {
  syncedAt: ISODateString;
}

export interface SessionEndedPayload {
  reason: 'SIGNED_OUT' | 'EXPIRED' | 'DISABLED';
}

export interface GameStationRequestPayload {
  stationId: string;
}

export interface GameShareRoomPayload {
  stationId: string;
  /** The invite link (MANUAL_INVITE_LINK) or room code (ROOM_CODE). Validated against the provider allowlist. */
  invite: string;
}

export interface GameReadyPayload {
  sessionId: string;
}

export type GameInputPayload = PongInput;

export interface GameStationsPayload {
  stations: GameStationState[];
}

export type GameStationUpdatedPayload = GameStationState;

export interface GameSessionPayload {
  session: GameSession | null;
}

export type GameStatePayload = PongState;

export interface GameErrorPayload {
  code: GameErrorCode;
  message: string;
}

/* ---------------------------------------------------------------------- */
/* socket.io typed maps                                                    */
/* ---------------------------------------------------------------------- */

export interface ServerToClientEvents {
  [SOCKET_EVENTS.PLAYER_JOINED]: (payload: PlayerJoinedPayload) => void;
  [SOCKET_EVENTS.PLAYER_LEFT]: (payload: PlayerLeftPayload) => void;
  [SOCKET_EVENTS.PLAYER_POSITION]: (payload: PlayerPositionBroadcast) => void;
  [SOCKET_EVENTS.PLAYER_AUTO_MOVE]: (payload: PlayerAutoMovePayload) => void;
  [SOCKET_EVENTS.PLAYER_AVATAR_UPDATED]: (payload: PlayerAvatarUpdatedPayload) => void;

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
  [SOCKET_EVENTS.WORK_SYNCED]: (payload: WorkSyncedPayload) => void;
  [SOCKET_EVENTS.SESSION_ENDED]: (payload: SessionEndedPayload) => void;

  [SOCKET_EVENTS.GAME_STATIONS]: (payload: GameStationsPayload) => void;
  [SOCKET_EVENTS.GAME_STATION_UPDATED]: (payload: GameStationUpdatedPayload) => void;
  [SOCKET_EVENTS.GAME_SESSION]: (payload: GameSessionPayload) => void;
  [SOCKET_EVENTS.GAME_STATE]: (payload: GameStatePayload) => void;
  [SOCKET_EVENTS.GAME_ERROR]: (payload: GameErrorPayload) => void;
}

export interface ClientToServerEvents {
  [SOCKET_EVENTS.OFFICE_JOIN]: (payload: OfficeJoinPayload) => void;
  [SOCKET_EVENTS.OFFICE_LEAVE]: (payload: OfficeLeavePayload) => void;
  [SOCKET_EVENTS.PLAYER_MOVE]: (payload: PlayerMovePayload) => void;
  [SOCKET_EVENTS.PLAYER_AVATAR_UPDATE]: (payload: PlayerAvatarUpdatedPayload) => void;

  [SOCKET_EVENTS.GAME_SYNC]: () => void;
  [SOCKET_EVENTS.GAME_JOIN_TABLE]: (payload: GameStationRequestPayload) => void;
  [SOCKET_EVENTS.GAME_LEAVE_TABLE]: (payload: GameStationRequestPayload) => void;
  [SOCKET_EVENTS.GAME_SHARE_ROOM]: (payload: GameShareRoomPayload) => void;
  [SOCKET_EVENTS.GAME_READY]: (payload: GameReadyPayload) => void;
  [SOCKET_EVENTS.GAME_INPUT]: (payload: GameInputPayload) => void;
}

export interface InterServerEvents {
  ping: () => void;
}

export interface SocketData {
  employeeId: UUID;
  organizationId: UUID;
  /** Set once the socket has joined an office. */
  officeId?: UUID;
  /** Application session behind a production socket (absent for demo tokens); lets sign-out close it. */
  sessionId?: UUID;
}
