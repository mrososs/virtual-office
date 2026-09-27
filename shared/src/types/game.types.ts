import type { ISODateString, UUID } from './common.types.js';

/** Which game a station offers. */
export type GameType = 'PONG' | 'TIC_TAC_TOE' | 'CONNECT_FOUR' | 'CHESS';

/**
 * Where the game itself runs.
 * - EXTERNAL_URL: a browser game from an allowlisted provider (see `GAME_PROVIDERS`). The office only
 *   coordinates who plays where; the provider runs rules, networking and scoring.
 * - INTERNAL_GAME: a game simulated by our own backend (the internal Pong engine). Kept for later; no
 *   station uses it today, so no game loop runs.
 */
export type GameLaunchType = 'EXTERNAL_URL' | 'INTERNAL_GAME';

/**
 * How a provider's private room comes to exist.
 * - API_CREATED_ROOM: the backend creates it through the provider's documented public API.
 * - MANUAL_INVITE_LINK: the host creates it on the provider's site and pastes its invite link.
 * - ROOM_CODE: the provider has no invite links; the host pastes the room code and both players open
 *   the provider's (fixed) game page, where the second player types the code.
 */
export type GameRoomMode = 'API_CREATED_ROOM' | 'MANUAL_INVITE_LINK' | 'ROOM_CODE';

/** A physical spot in the office where a game is played (a table, a board). */
export interface GameStation {
  id: string;
  gameType: GameType;
  name: string;
  roomId: UUID;
  capacity: number;
  launchType: GameLaunchType;
  /** EXTERNAL_URL stations: the provider in `GAME_PROVIDERS`. */
  providerId?: string;
}

/** AVAILABLE 0 players · WAITING 1 of 2 · READY (internal games: match found / over) · IN_GAME 2 of 2. */
export type GameStationStatus = 'AVAILABLE' | 'WAITING' | 'READY' | 'IN_GAME';

export interface GameStationParticipant {
  employeeId: UUID;
  joinedAt: ISODateString;
}

/** Public occupancy of one station, broadcast to the whole office. Never carries a room link. */
export interface GameStationState {
  stationId: string;
  status: GameStationStatus;
  capacity: number;
  /** In join order: the first participant is the host. */
  participants: GameStationParticipant[];
  /** Someone is waiting and their room is ready, so the next person can join. */
  joinable: boolean;
}

export type GameEndReason = 'COMPLETED' | 'OPPONENT_LEFT' | 'OPPONENT_DISCONNECTED' | 'TIMED_OUT';

/** EXTERNAL session lifecycle: host joined → room shared → opponent joined. */
export type ExternalGameStatus = 'SETUP' | 'WAITING' | 'IN_GAME';

/** What one participant needs to reach the room. Sent only to that participant. */
export interface ExternalRoomAccess {
  /** The page to open (this participant's own seat link where the provider has one). */
  url: string;
  /** ROOM_CODE providers: the code to type on the provider's page. */
  code: string | null;
}

/** An external game at a station, as one participant sees it. */
export interface ExternalGameSession {
  kind: 'EXTERNAL';
  sessionId: string;
  stationId: string;
  gameType: GameType;
  providerId: string;
  hostEmployeeId: UUID;
  participants: UUID[];
  status: ExternalGameStatus;
  /** Null until the host's room exists (and for nobody but the participants, ever). */
  room: ExternalRoomAccess | null;
  createdAt: ISODateString;
  updatedAt: ISODateString;
  /** ms until the session is cleaned up if nothing changes, measured when the server sent this. */
  expiresInMs: number;
  /** Set once, when the session ends for this participant. */
  endReason: GameEndReason | null;
}

export type PongSessionStatus = 'READY' | 'COUNTDOWN' | 'PLAYING' | 'PAUSED' | 'ENDED' | 'ABANDONED';

/** One internal Pong match between the players at a station. Sent to its players only. */
export interface PongSession {
  kind: 'PONG';
  sessionId: string;
  stationId: string;
  gameType: GameType;
  /** [left, right] — the first and second player to join the table. */
  players: [UUID, UUID];
  createdAt: ISODateString;
  status: PongSessionStatus;
  /** Who pressed Start (READY) or Rematch (ENDED). */
  readyPlayerIds: UUID[];
  score: [number, number];
  targetScore: number;
  winnerId: UUID | null;
  endReason: GameEndReason | null;
  /** COUNTDOWN: ms until play (re)starts, measured when the server sent this. */
  countdownMs: number | null;
  /** PAUSED: whose connection dropped, and ms before they forfeit their place. */
  pausedPlayerId: UUID | null;
  graceMs: number | null;
  /** READY / ENDED: ms before players who have not pressed Start / Rematch are released from the table. */
  decisionMs: number | null;
}

export type GameSession = ExternalGameSession | PongSession;

/** Which way my paddle is moving: up, still, down. */
export type PongDirection = -1 | 0 | 1;

/** Client → server. Sent on change and as a heartbeat while playing; never per frame. */
export interface PongInput {
  sessionId: string;
  direction: PongDirection;
}

/** Authoritative snapshot, sent to both players at the rules' tick rate while PLAYING. */
export interface PongState {
  sessionId: string;
  tick: number;
  ball: { x: number; y: number; vx: number; vy: number };
  /** Paddle centers (y), [left, right]. */
  paddles: [number, number];
  /** Current paddle directions, so clients can extrapolate the opponent between snapshots. */
  directions: [PongDirection, PongDirection];
}

export type GameErrorCode =
  | 'NOT_IN_OFFICE'
  | 'UNKNOWN_STATION'
  | 'STATION_FULL'
  | 'ALREADY_AT_STATION'
  | 'NOT_AT_STATION'
  | 'NOT_HOST'
  | 'ROOM_NOT_READY'
  | 'INVALID_INVITE'
  | 'PROVIDER_UNAVAILABLE'
  | 'STALE_SESSION'
  | 'RATE_LIMITED'
  | 'TIMED_OUT';
