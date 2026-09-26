import type {
  ActivityType,
  AvatarAppearance,
  AvatarProfile,
  Desk,
  MeetingStatus,
  PlacementTarget,
  PresenceStatus,
  Room,
  RoomType,
  UUID,
} from '@virtual-office/shared';

import type { OfficeMapDefinition } from '@/game/maps/office-map.types';

/**
 * Canonical list of events that cross the Vue <-> Phaser boundary.
 * Always add new cross-boundary events here — never invent a string literal
 * event name inline in a component or scene.
 */
export const GAME_EVENTS = {
  /* Phaser -> Vue ----------------------------------------------------- */
  GAME_READY: 'game:ready',
  OFFICE_LOADED: 'office:loaded',
  GAME_ERROR: 'game:error',
  EMPLOYEE_CLICKED: 'employee:clicked',
  DESK_CLICKED: 'desk:clicked',
  ROOM_CLICKED: 'room:clicked',
  BACKGROUND_CLICKED: 'background:clicked',
  OPEN_MEETING_DETAILS: 'ui:open_meeting_details',
  MEETING_JOIN_REQUESTED: 'meeting:join_requested',
  PLAYER_ENTERED_ROOM: 'player:entered_room',
  PLAYER_LEFT_ROOM: 'player:left_room',
  EMPLOYEE_ROOM_CHANGED: 'employee:room_changed',
  EMPLOYEE_ARRIVED: 'employee:arrived',
  INTERACTION_AVAILABLE: 'interaction:available',
  CAMERA_CHANGED: 'camera:changed',
  LOCAL_NAVIGATION_CHANGED: 'player:navigation_changed',
  REALTIME_STATUS_CHANGED: 'realtime:status_changed',
  LIVE_EMPLOYEES_CHANGED: 'realtime:live_employees_changed',
  /** A connected teammate's avatar arrived over the socket (join or change). Vue stores it; it flows back as SET_EMPLOYEE_APPEARANCE. */
  REMOTE_AVATAR_RECEIVED: 'realtime:avatar_received',

  /* Vue -> Phaser ----------------------------------------------------- */
  OFFICE_INIT: 'office:init',
  RESET_OFFICE: 'office:reset',
  SET_EMPLOYEE_STATUS: 'employee:set_status',
  SET_EMPLOYEE_APPEARANCE: 'employee:set_appearance',
  MOVE_EMPLOYEE: 'employee:move',
  SET_ROOM_MEETING: 'room:set_meeting',
  SET_SELECTION: 'selection:set',
  FOCUS_EMPLOYEE: 'camera:focus_employee',
  FOCUS_ROOM: 'camera:focus_room',
  RECENTER_CAMERA: 'camera:recenter',
  SET_ZOOM: 'camera:set_zoom',
  NAVIGATE_LOCAL_PLAYER: 'player:navigate',
  CANCEL_LOCAL_NAVIGATION: 'player:cancel_navigation',
} as const;

export type GameEventName = (typeof GAME_EVENTS)[keyof typeof GAME_EVENTS];

export type InteractionSource = 'pointer' | 'keyboard';

export interface InteractionTarget {
  kind: 'EMPLOYEE' | 'DESK' | 'ROOM';
  id: UUID;
  label: string;
}

/** Presentation-ready status for one avatar. Vue formats it; Phaser only draws it. */
export interface EmployeeStatusView {
  employeeId: UUID;
  displayName: string;
  presence: PresenceStatus;
  activity: ActivityType;
  statusLine: string;
}

export interface EmployeeWorldState {
  status: EmployeeStatusView;
  /** Normalized (always renderable) look from the employee's AvatarProfile. */
  appearance: AvatarAppearance;
  placement: PlacementTarget;
}

export interface EmployeeAppearanceUpdate {
  employeeId: UUID;
  appearance: AvatarAppearance;
  /** The saved profile behind `appearance`; for the local player it is what gets broadcast to peers. */
  profile: AvatarProfile | null;
}

export interface RoomMeetingView {
  meetingId: UUID;
  title: string;
  status: MeetingStatus;
  startAt: string;
  endAt: string;
}

export interface RoomMeetingState {
  roomId: UUID;
  meeting: RoomMeetingView | null;
}

export type RealtimeConnectionStatus = 'disabled' | 'connecting' | 'connected' | 'disconnected';

export interface RealtimeOptions {
  officeId: UUID;
  employeeId: UUID;
}

export interface OfficeInitPayload {
  map: OfficeMapDefinition;
  rooms: Room[];
  desks: Desk[];
  localPlayer: EmployeeWorldState;
  /** The local player's saved avatar, announced to peers on join. */
  localAvatar: AvatarProfile | null;
  /** Everyone except the local player. */
  employees: EmployeeWorldState[];
  roomMeetings: RoomMeetingState[];
  realtime: RealtimeOptions | null;
  /** null = fit the viewport. */
  zoom: number | null;
}

export type NavigationRequest =
  | { kind: 'ROOM'; roomId: UUID }
  | { kind: 'DESK'; deskId: UUID }
  | { kind: 'EMPLOYEE'; employeeId: UUID };

/**
 * Maps every event name to its payload shape. Extend this whenever a new
 * entry is added to GAME_EVENTS so `GameBridge.on`/`emit` stay fully typed.
 * (A type alias, not an interface, so it satisfies mitt's Record constraint.)
 */
export type GameEventPayloadMap = {
  [GAME_EVENTS.GAME_READY]: void;
  [GAME_EVENTS.OFFICE_LOADED]: { floorKey: string };
  [GAME_EVENTS.GAME_ERROR]: { message: string };
  [GAME_EVENTS.EMPLOYEE_CLICKED]: { employeeId: UUID; source: InteractionSource };
  [GAME_EVENTS.DESK_CLICKED]: { deskId: UUID; source: InteractionSource };
  [GAME_EVENTS.ROOM_CLICKED]: { roomId: UUID; source: InteractionSource };
  [GAME_EVENTS.BACKGROUND_CLICKED]: void;
  [GAME_EVENTS.OPEN_MEETING_DETAILS]: { roomId: UUID };
  [GAME_EVENTS.MEETING_JOIN_REQUESTED]: { roomId: UUID };
  [GAME_EVENTS.PLAYER_ENTERED_ROOM]: { employeeId: UUID; roomId: UUID; roomType: RoomType };
  [GAME_EVENTS.PLAYER_LEFT_ROOM]: { employeeId: UUID; roomId: UUID };
  [GAME_EVENTS.EMPLOYEE_ROOM_CHANGED]: { employeeId: UUID; roomId: UUID | null; previousRoomId: UUID | null };
  [GAME_EVENTS.EMPLOYEE_ARRIVED]: { employeeId: UUID; placement: PlacementTarget };
  [GAME_EVENTS.INTERACTION_AVAILABLE]: { target: InteractionTarget | null };
  [GAME_EVENTS.CAMERA_CHANGED]: { zoom: number; followingPlayer: boolean };
  [GAME_EVENTS.LOCAL_NAVIGATION_CHANGED]: { label: string | null; outcome?: 'arrived' | 'cancelled' | 'unreachable' };
  [GAME_EVENTS.REALTIME_STATUS_CHANGED]: { status: RealtimeConnectionStatus };
  [GAME_EVENTS.LIVE_EMPLOYEES_CHANGED]: { employeeIds: UUID[] };
  [GAME_EVENTS.REMOTE_AVATAR_RECEIVED]: { employeeId: UUID; avatar: AvatarProfile };

  [GAME_EVENTS.OFFICE_INIT]: OfficeInitPayload;
  [GAME_EVENTS.RESET_OFFICE]: { employees: EmployeeWorldState[]; localPlayer: EmployeeStatusView; roomMeetings: RoomMeetingState[] };
  [GAME_EVENTS.SET_EMPLOYEE_STATUS]: EmployeeStatusView;
  [GAME_EVENTS.SET_EMPLOYEE_APPEARANCE]: EmployeeAppearanceUpdate;
  [GAME_EVENTS.MOVE_EMPLOYEE]: { employeeId: UUID; placement: PlacementTarget };
  [GAME_EVENTS.SET_ROOM_MEETING]: RoomMeetingState;
  [GAME_EVENTS.SET_SELECTION]: { employeeId: UUID | null; roomId: UUID | null; deskId: UUID | null };
  [GAME_EVENTS.FOCUS_EMPLOYEE]: { employeeId: UUID };
  [GAME_EVENTS.FOCUS_ROOM]: { roomId: UUID };
  [GAME_EVENTS.RECENTER_CAMERA]: void;
  [GAME_EVENTS.SET_ZOOM]: { zoom: number };
  [GAME_EVENTS.NAVIGATE_LOCAL_PLAYER]: { request: NavigationRequest; label: string };
  [GAME_EVENTS.CANCEL_LOCAL_NAVIGATION]: void;
};
