import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import {
  findGameProvider,
  findGameStation,
  GAME_STATIONS,
  PONG_RULES,
  type ExternalGameSession,
  type ExternalGameStatus,
  type GameEndReason,
  type GameErrorCode,
  type GameProvider,
  type GameSession,
  type GameStation,
  type GameStationState,
  type PongDirection,
  type PongSession,
  type PongSessionStatus,
  type PongState,
  type UUID,
} from '@virtual-office/shared';
import { randomUUID } from 'node:crypto';

import { ExternalGameUrlValidator } from './external/external-game-url.validator';
import { ExternalRoomUnavailableError, LichessRoomClient, type ExternalRoomLinks } from './external/lichess-room.client';
import { PongMatch } from './pong/pong-match';
import type { PongSide } from './pong/pong.engine';

/** How long a dropped player keeps their place (reload, Wi-Fi blip) before it is released. */
export const DISCONNECT_GRACE_MS = 15_000;
/** Internal Pong: playing clients heartbeat every `inputHeartbeatMs`; this much silence counts as a dropped connection. */
export const PLAYER_STALE_MS = 3 * PONG_RULES.inputHeartbeatMs;
/** Internal Pong: time to press Start / Rematch before idle players are released. */
export const DECISION_WINDOW_MS = 60_000;
/** External games: how long each phase may last before the table is freed. */
export const EXTERNAL_TTL_MS: Readonly<Record<ExternalGameStatus, number>> = {
  SETUP: 10 * 60_000,
  WAITING: 30 * 60_000,
  IN_GAME: 90 * 60_000,
};
const STALE_CHECK_INTERVAL_MS = 500;

/** Where the manager's results go. Implemented by the gateway (socket rooms); nothing here knows Socket.IO. */
export interface GameBroadcaster {
  stationChanged(officeId: UUID, state: GameStationState): void;
  /** To every open tab of one employee. `null` = you have no game at a station any more. */
  session(employeeId: UUID, session: GameSession | null): void;
  state(employeeIds: UUID[], state: PongState): void;
  notice(employeeId: UUID, code: GameErrorCode, message: string): void;
}

export class GameActionError extends Error {
  constructor(
    readonly code: GameErrorCode,
    message: string,
  ) {
    super(message);
  }
}

interface Participant {
  employeeId: UUID;
  joinedAt: string;
  lastSeenAt: number;
  /** Running while the employee has no live connection; firing releases their place. */
  graceTimer: NodeJS.Timeout | null;
}

/** A game on a provider's site. The office keeps who sits where and the private room link — never scores. */
interface ExternalSessionRecord {
  kind: 'EXTERNAL';
  id: string;
  createdAt: string;
  updatedAt: number;
  provider: GameProvider;
  hostEmployeeId: UUID;
  status: ExternalGameStatus;
  /** Private: handed only to participants (the host their seat link, the opponent theirs). */
  room: { hostUrl: string; guestUrl: string; code: string | null } | null;
  expiresAt: number;
  expiryTimer: NodeJS.Timeout | null;
}

/** An internal Pong match. Only INTERNAL_GAME stations create one; none do today. */
interface PongSessionRecord {
  kind: 'PONG';
  id: string;
  createdAt: string;
  status: PongSessionStatus;
  players: [UUID, UUID];
  ready: Set<UUID>;
  winnerId: UUID | null;
  endReason: GameEndReason | null;
  match: PongMatch;
  countdownEndsAt: number | null;
  countdownTimer: NodeJS.Timeout | null;
  pausedPlayerId: UUID | null;
  pauseEndsAt: number | null;
  decisionEndsAt: number | null;
  decisionTimer: NodeJS.Timeout | null;
  lastStaleCheckAt: number;
}

type SessionRecord = ExternalSessionRecord | PongSessionRecord;

interface StationRecord {
  officeId: UUID;
  station: GameStation;
  participants: Participant[];
  session: SessionRecord | null;
}

/**
 * Authoritative Game Room state: who occupies which station and the game
 * going on there. Callers pass the employee id of the authenticated socket —
 * never an id from a payload. One employee sits at one station at a time.
 *
 * Occupancy, disconnect grace, cleanup and privacy are shared by every
 * station. What happens once a station is occupied depends on its launch type:
 *   EXTERNAL_URL  host joins → room created (API) or shared (link / code) → opponent joins → IN_GAME.
 *                 The provider runs the game; nothing here ticks. Any player leaving ends the session.
 *   INTERNAL_GAME the internal Pong engine (a 30 Hz loop that exists only while a ball is in play).
 *
 * Everything lives in this process's memory and requires a single backend
 * instance (like the office presence registry). Scaling out means moving
 * this to shared state (e.g. Redis) first.
 */
@Injectable()
export class GameSessionManager implements OnModuleDestroy {
  private readonly logger = new Logger(GameSessionManager.name);
  private readonly records = new Map<string, StationRecord>();
  private readonly seats = new Map<string, StationRecord>();
  private broadcaster: GameBroadcaster | null = null;

  constructor(
    private readonly validator: ExternalGameUrlValidator,
    private readonly lichess: LichessRoomClient,
  ) {}

  setBroadcaster(broadcaster: GameBroadcaster): void {
    this.broadcaster = broadcaster;
  }

  onModuleDestroy(): void {
    for (const record of this.records.values()) {
      for (const participant of record.participants) this.clearGrace(participant);
      this.closeSession(record);
    }
    this.records.clear();
    this.seats.clear();
  }

  /** Timers currently alive (tests and diagnostics: an idle Game Room must report zero). */
  activeTimerCount(): number {
    let count = 0;
    for (const record of this.records.values()) {
      count += record.participants.filter((participant) => participant.graceTimer).length;
      const session = record.session;
      if (session?.kind === 'EXTERNAL' && session.expiryTimer) count += 1;
      if (session?.kind === 'PONG') count += [session.countdownTimer, session.decisionTimer].filter(Boolean).length + (session.match.running ? 1 : 0);
    }
    return count;
  }

  /** Every station of the office and this employee's game. Also counts as "I'm back" after a reconnect. */
  sync(officeId: UUID, employeeId: UUID): { stations: GameStationState[]; session: GameSession | null } {
    const record = this.seats.get(seatKey(officeId, employeeId));
    if (record) this.touch(record, employeeId);
    return {
      stations: GAME_STATIONS.map((station) => this.stateOf(this.records.get(recordKey(officeId, station.id)), station)),
      session: record ? this.viewFor(record, employeeId) : null,
    };
  }

  join(officeId: UUID, employeeId: UUID, stationId: unknown): void {
    const station = findGameStation(stationId);
    if (!station) throw new GameActionError('UNKNOWN_STATION', 'That game station does not exist.');

    const seated = this.seats.get(seatKey(officeId, employeeId));
    if (seated) {
      if (seated.station.id !== station.id) throw new GameActionError('ALREADY_AT_STATION', `You are already at the ${seated.station.name}.`);
      // Double click, a second tab, or a reconnect: nothing changes, the caller just gets the current picture again.
      this.touch(seated, employeeId);
      this.broadcaster?.session(employeeId, this.viewFor(seated, employeeId));
      this.broadcaster?.stationChanged(officeId, this.stateOf(seated, station));
      return;
    }

    const record = this.recordFor(officeId, station);
    if (record.participants.length >= station.capacity) throw new GameActionError('STATION_FULL', `The ${station.name} is full.`);

    if (station.launchType === 'EXTERNAL_URL') {
      const session = record.session?.kind === 'EXTERNAL' ? record.session : null;
      if (record.participants.length > 0 && session?.status !== 'WAITING') {
        throw new GameActionError('ROOM_NOT_READY', 'The host is still setting up the room. Try again in a moment.');
      }
      this.seat(record, employeeId);
      if (!session) this.openExternal(record, employeeId);
      else this.startExternal(record, session);
    } else {
      this.seat(record, employeeId);
      if (record.participants.length === station.capacity && !record.session) this.openPong(record);
    }
    this.publishStation(record);
  }

  leave(officeId: UUID, employeeId: UUID, stationId: unknown): void {
    const record = this.seats.get(seatKey(officeId, employeeId));
    if (!record || record.station.id !== stationId) {
      // Already gone (a second click, another tab left first): make sure every tab agrees.
      this.broadcaster?.session(employeeId, null);
      return;
    }
    this.release(record, employeeId, 'OPPONENT_LEFT');
  }

  /** External games: the host shares the room they created on the provider's site (a link, or a room code). */
  shareRoom(officeId: UUID, employeeId: UUID, stationId: unknown, invite: unknown): void {
    const record = this.seats.get(seatKey(officeId, employeeId));
    if (!record || record.station.id !== stationId) throw new GameActionError('NOT_AT_STATION', 'Join the table first.');
    const session = record.session;
    if (session?.kind !== 'EXTERNAL') throw new GameActionError('STALE_SESSION', 'This table has no external game.');
    if (session.hostEmployeeId !== employeeId) throw new GameActionError('NOT_HOST', 'Only the player who opened the table shares its room.');
    if (session.provider.roomMode === 'API_CREATED_ROOM') throw new GameActionError('INVALID_INVITE', 'This table creates its room for you.');
    if (session.status === 'IN_GAME') throw new GameActionError('STALE_SESSION', 'Your opponent already joined this room.');

    const check = this.validator.validate(session.provider.id, invite);
    if (!check.ok) throw new GameActionError('INVALID_INVITE', check.reason);
    this.touch(record, employeeId);
    session.room = { hostUrl: check.url, guestUrl: check.url, code: check.code };
    this.setExternalStatus(record, session, 'WAITING');
    this.publishSession(record);
    this.publishStation(record);
  }

  /** Internal Pong: Start (match found) or Rematch (match over). Play begins once both players are ready. */
  ready(officeId: UUID, employeeId: UUID, sessionId: unknown): void {
    const record = this.seats.get(seatKey(officeId, employeeId));
    if (!record) throw new GameActionError('NOT_AT_STATION', 'You are not at a game table.');
    const session = record.session;
    if (session?.kind !== 'PONG' || session.id !== sessionId) throw new GameActionError('STALE_SESSION', 'That match is over.');
    this.touch(record, employeeId);
    if (session.status !== 'READY' && session.status !== 'ENDED') return;

    session.ready.add(employeeId);
    if (session.ready.size < session.players.length) {
      this.publishSession(record);
      return;
    }
    if (session.status === 'ENDED') {
      session.match.reset();
      session.winnerId = null;
      session.endReason = null;
    }
    this.clearDecision(session);
    this.startCountdown(record, session);
    this.publishStation(record);
  }

  /** Internal Pong: paddle direction (also the playing client's heartbeat). Stale or foreign session ids are ignored. */
  input(officeId: UUID, employeeId: UUID, sessionId: unknown, direction: PongDirection): void {
    const record = this.seats.get(seatKey(officeId, employeeId));
    const session = record?.session;
    if (!record || session?.kind !== 'PONG' || session.id !== sessionId) return;
    this.touch(record, employeeId);
    const side = session.players.indexOf(employeeId);
    if (session.status === 'PLAYING' && side >= 0) session.match.setDirection(side as PongSide, direction);
  }

  /** The employee's last connection to this office closed. They keep their place for a short grace period. */
  connectionLost(officeId: UUID, employeeId: UUID): void {
    const record = this.seats.get(seatKey(officeId, employeeId));
    if (record) this.suspend(record, employeeId);
  }

  /* Occupancy (every station) ------------------------------------------------ */

  private recordFor(officeId: UUID, station: GameStation): StationRecord {
    const key = recordKey(officeId, station.id);
    let record = this.records.get(key);
    if (!record) {
      record = { officeId, station, participants: [], session: null };
      this.records.set(key, record);
    }
    return record;
  }

  private seat(record: StationRecord, employeeId: UUID): void {
    record.participants.push({ employeeId, joinedAt: new Date().toISOString(), lastSeenAt: Date.now(), graceTimer: null });
    this.seats.set(seatKey(record.officeId, employeeId), record);
  }

  /** Lost connection (socket closed or Pong heartbeats stopped): start the grace timer; a running Pong match freezes. */
  private suspend(record: StationRecord, employeeId: UUID): void {
    const participant = record.participants.find((candidate) => candidate.employeeId === employeeId);
    if (!participant || participant.graceTimer) return;
    participant.graceTimer = setTimeout(() => {
      participant.graceTimer = null;
      this.release(record, employeeId, 'OPPONENT_DISCONNECTED');
    }, DISCONNECT_GRACE_MS);

    const session = record.session;
    if (session?.kind === 'PONG' && (session.status === 'COUNTDOWN' || session.status === 'PLAYING')) {
      if (session.countdownTimer) clearTimeout(session.countdownTimer);
      session.countdownTimer = null;
      session.countdownEndsAt = null;
      session.match.pause();
      session.status = 'PAUSED';
      session.pausedPlayerId = employeeId;
      session.pauseEndsAt = Date.now() + DISCONNECT_GRACE_MS;
      this.publishSession(record);
    }
  }

  /** Any sign of life from a participant: cancels their grace timer (and resumes a Pong match paused for them). */
  private touch(record: StationRecord, employeeId: UUID): void {
    const participant = record.participants.find((candidate) => candidate.employeeId === employeeId);
    if (!participant) return;
    participant.lastSeenAt = Date.now();
    if (!participant.graceTimer) return;
    this.clearGrace(participant);
    const session = record.session;
    if (session?.kind === 'PONG' && session.status === 'PAUSED' && session.pausedPlayerId === employeeId) this.startCountdown(record, session);
  }

  /** Removes a participant and settles what that means for the game at the station. */
  private release(record: StationRecord, employeeId: UUID, reason: GameEndReason): void {
    const index = record.participants.findIndex((candidate) => candidate.employeeId === employeeId);
    if (index < 0) return;
    const [participant] = record.participants.splice(index, 1);
    if (participant) this.clearGrace(participant);
    this.seats.delete(seatKey(record.officeId, employeeId));
    this.broadcaster?.session(employeeId, null);

    const session = record.session;
    if (session?.kind === 'EXTERNAL') this.endExternal(record, session, reason, employeeId);
    else if (session?.kind === 'PONG') this.abandonPong(record, session, employeeId, reason);
    this.publishStation(record);
  }

  private clearGrace(participant: Participant): void {
    if (participant.graceTimer) clearTimeout(participant.graceTimer);
    participant.graceTimer = null;
  }

  /** Stops every timer of the station's game and detaches it. */
  private closeSession(record: StationRecord): void {
    const session = record.session;
    if (!session) return;
    if (session.kind === 'EXTERNAL') {
      if (session.expiryTimer) clearTimeout(session.expiryTimer);
      session.expiryTimer = null;
    } else {
      session.match.stop();
      if (session.countdownTimer) clearTimeout(session.countdownTimer);
      session.countdownTimer = null;
      this.clearDecision(session);
    }
    record.session = null;
  }

  private publishSession(record: StationRecord): void {
    for (const participant of record.participants) this.broadcaster?.session(participant.employeeId, this.viewFor(record, participant.employeeId));
  }

  private publishStation(record: StationRecord): void {
    this.broadcaster?.stationChanged(record.officeId, this.stateOf(record, record.station));
    if (record.participants.length === 0 && !record.session) this.records.delete(recordKey(record.officeId, record.station.id));
  }

  /** Public occupancy. Never includes a room link or code. */
  private stateOf(record: StationRecord | undefined, station: GameStation): GameStationState {
    const participants = (record?.participants ?? []).map(({ employeeId, joinedAt }) => ({ employeeId, joinedAt }));
    const session = record?.session ?? null;
    let status: GameStationState['status'] = participants.length > 0 ? 'WAITING' : 'AVAILABLE';
    if (session?.kind === 'EXTERNAL' && session.status === 'IN_GAME') status = 'IN_GAME';
    if (session?.kind === 'PONG') status = session.status === 'READY' || session.status === 'ENDED' ? 'READY' : 'IN_GAME';
    const hasRoom = participants.length < station.capacity && participants.length > 0;
    const joinable = hasRoom && (session?.kind === 'EXTERNAL' ? session.status === 'WAITING' : !session);
    return { stationId: station.id, status, capacity: station.capacity, participants, joinable };
  }

  private viewFor(record: StationRecord, employeeId: UUID): GameSession | null {
    const session = record.session;
    if (!session) return null;
    return session.kind === 'EXTERNAL' ? this.externalView(record, session, employeeId, null) : this.pongView(record.station, session);
  }

  /* External games ------------------------------------------------------------ */

  private openExternal(record: StationRecord, hostEmployeeId: UUID): void {
    const provider = findGameProvider(record.station.providerId);
    if (!provider) throw new GameActionError('UNKNOWN_STATION', 'This table has no game provider configured.');
    const session: ExternalSessionRecord = {
      kind: 'EXTERNAL',
      id: randomUUID(),
      createdAt: new Date().toISOString(),
      updatedAt: Date.now(),
      provider,
      hostEmployeeId,
      status: 'SETUP',
      room: null,
      expiresAt: 0,
      expiryTimer: null,
    };
    record.session = session;
    this.setExternalStatus(record, session, 'SETUP');
    this.publishSession(record);
    this.logger.log(`External game ${session.id} opened at ${record.station.id} (${provider.id})`);
    if (provider.roomMode === 'API_CREATED_ROOM') void this.createApiRoom(record, session);
  }

  /** API-created rooms (Lichess): made server-side, so nobody pastes anything. */
  private async createApiRoom(record: StationRecord, session: ExternalSessionRecord): Promise<void> {
    let links: ExternalRoomLinks;
    try {
      links = await this.lichess.createRoom();
    } catch (error) {
      if (record.session !== session) return;
      const message = error instanceof ExternalRoomUnavailableError ? error.message : 'The game could not be created. Try again in a minute.';
      this.broadcaster?.notice(session.hostEmployeeId, 'PROVIDER_UNAVAILABLE', message);
      this.release(record, session.hostEmployeeId, 'TIMED_OUT');
      return;
    }
    // The host may have left (or the table timed out) while the provider was answering.
    if (record.session !== session || session.status !== 'SETUP') return;
    session.room = { hostUrl: links.hostUrl, guestUrl: links.guestUrl, code: null };
    this.setExternalStatus(record, session, 'WAITING');
    this.publishSession(record);
    this.publishStation(record);
  }

  /** The opponent sat down: both get their seat link. */
  private startExternal(record: StationRecord, session: ExternalSessionRecord): void {
    this.setExternalStatus(record, session, 'IN_GAME');
    this.publishSession(record);
    this.logger.log(`External game ${session.id} started at ${record.station.id}`);
  }

  private setExternalStatus(record: StationRecord, session: ExternalSessionRecord, status: ExternalGameStatus): void {
    session.status = status;
    session.updatedAt = Date.now();
    if (session.expiryTimer) clearTimeout(session.expiryTimer);
    const ttl = EXTERNAL_TTL_MS[status];
    session.expiresAt = Date.now() + ttl;
    session.expiryTimer = setTimeout(() => {
      session.expiryTimer = null;
      if (record.session !== session) return;
      for (const participant of [...record.participants]) {
        this.broadcaster?.notice(participant.employeeId, 'TIMED_OUT', `The ${record.station.name} was freed after a long time without a change.`);
      }
      this.endExternal(record, session, 'TIMED_OUT');
      this.publishStation(record);
    }, ttl);
  }

  /**
   * An external session ends as soon as anyone leaves (or it times out): the
   * provider's game can't continue at our table without both players. The
   * others get a final "ended" view (with no room link), and the table is free.
   */
  private endExternal(record: StationRecord, session: ExternalSessionRecord, reason: GameEndReason, leaverId: UUID | null = null): void {
    this.closeSession(record);
    const remaining = record.participants.splice(0);
    // The final view still says who was at the table, so the others can be told who left.
    const everyone = [...(leaverId ? [leaverId] : []), ...remaining.map((participant) => participant.employeeId)];
    for (const participant of remaining) {
      this.clearGrace(participant);
      this.seats.delete(seatKey(record.officeId, participant.employeeId));
      this.broadcaster?.session(participant.employeeId, { ...this.externalView(record, session, participant.employeeId, reason), participants: everyone });
    }
    this.logger.log(`External game ${session.id} ended (${reason})`);
  }

  private externalView(record: StationRecord, session: ExternalSessionRecord, employeeId: UUID, endReason: GameEndReason | null): ExternalGameSession {
    const isHost = employeeId === session.hostEmployeeId;
    const room = session.room && endReason === null ? { url: isHost ? session.room.hostUrl : session.room.guestUrl, code: session.room.code } : null;
    return {
      kind: 'EXTERNAL',
      sessionId: session.id,
      stationId: record.station.id,
      gameType: record.station.gameType,
      providerId: session.provider.id,
      hostEmployeeId: session.hostEmployeeId,
      participants: record.participants.map((participant) => participant.employeeId),
      status: session.status,
      room,
      createdAt: session.createdAt,
      updatedAt: new Date(session.updatedAt).toISOString(),
      expiresInMs: Math.max(0, session.expiresAt - Date.now()),
      endReason,
    };
  }

  /* Internal Pong (only INTERNAL_GAME stations) -------------------------------- */

  private openPong(record: StationRecord): void {
    const [first, second] = record.participants;
    if (!first || !second) return;
    const id = randomUUID();
    const session: PongSessionRecord = {
      kind: 'PONG',
      id,
      createdAt: new Date().toISOString(),
      status: 'READY',
      players: [first.employeeId, second.employeeId],
      ready: new Set(),
      winnerId: null,
      endReason: null,
      match: new PongMatch(id, {
        onState: (state) => this.onMatchState(record, session, state),
        onPoint: () => this.publishSession(record),
        onFinished: (winner) => this.onMatchFinished(record, session, winner),
      }),
      countdownEndsAt: null,
      countdownTimer: null,
      pausedPlayerId: null,
      pauseEndsAt: null,
      decisionEndsAt: null,
      decisionTimer: null,
      lastStaleCheckAt: 0,
    };
    record.session = session;
    this.startDecision(record, session);
    this.publishSession(record);
    this.logger.log(`Match ${id} ready at ${record.station.id}`);
  }

  private startCountdown(record: StationRecord, session: PongSessionRecord): void {
    if (session.countdownTimer) clearTimeout(session.countdownTimer);
    session.status = 'COUNTDOWN';
    session.pausedPlayerId = null;
    session.pauseEndsAt = null;
    session.countdownEndsAt = Date.now() + PONG_RULES.countdownMs;
    session.countdownTimer = setTimeout(() => {
      session.countdownTimer = null;
      if (record.session !== session || session.status !== 'COUNTDOWN') return;
      session.status = 'PLAYING';
      session.countdownEndsAt = null;
      // Heartbeats only start once the client sees PLAYING; don't count the countdown as silence.
      for (const participant of record.participants) participant.lastSeenAt = Math.max(participant.lastSeenAt, Date.now());
      session.match.start();
      this.publishSession(record);
    }, PONG_RULES.countdownMs);
    this.publishSession(record);
  }

  private onMatchState(record: StationRecord, session: PongSessionRecord, state: PongState): void {
    this.broadcaster?.state(session.players, state);
    const now = Date.now();
    if (now - session.lastStaleCheckAt < STALE_CHECK_INTERVAL_MS) return;
    session.lastStaleCheckAt = now;
    for (const participant of record.participants) {
      if (now - participant.lastSeenAt > PLAYER_STALE_MS) this.suspend(record, participant.employeeId);
    }
  }

  private onMatchFinished(record: StationRecord, session: PongSessionRecord, winner: PongSide): void {
    session.status = 'ENDED';
    session.winnerId = session.players[winner];
    session.endReason = 'COMPLETED';
    session.ready.clear();
    this.startDecision(record, session);
    this.publishSession(record);
    this.publishStation(record);
    this.logger.log(`Match ${session.id} finished ${session.match.score.join('-')}`);
  }

  /** A Pong player left: the match is over; the other player stays at the table, waiting. */
  private abandonPong(record: StationRecord, session: PongSessionRecord, leaverId: UUID, reason: GameEndReason): void {
    this.closeSession(record);
    const opponents = session.players.filter((id) => id !== leaverId && record.participants.some((candidate) => candidate.employeeId === id));
    if (opponents.length === 0) return;
    session.status = 'ABANDONED';
    session.endReason = reason;
    session.winnerId = null;
    for (const opponent of opponents) this.broadcaster?.session(opponent, this.pongView(record.station, session));
    this.logger.log(`Match ${session.id} closed (${reason})`);
  }

  private startDecision(record: StationRecord, session: PongSessionRecord): void {
    this.clearDecision(session);
    session.decisionEndsAt = Date.now() + DECISION_WINDOW_MS;
    session.decisionTimer = setTimeout(() => {
      session.decisionTimer = null;
      if (record.session !== session) return;
      for (const employeeId of session.players.filter((id) => !session.ready.has(id))) {
        this.broadcaster?.notice(employeeId, 'TIMED_OUT', `You left the ${record.station.name} after a minute without an answer.`);
        this.release(record, employeeId, 'TIMED_OUT');
      }
    }, DECISION_WINDOW_MS);
  }

  private clearDecision(session: PongSessionRecord): void {
    if (session.decisionTimer) clearTimeout(session.decisionTimer);
    session.decisionTimer = null;
    session.decisionEndsAt = null;
  }

  private pongView(station: GameStation, session: PongSessionRecord): PongSession {
    const now = Date.now();
    const remaining = (at: number | null) => (at === null ? null : Math.max(0, at - now));
    return {
      kind: 'PONG',
      sessionId: session.id,
      stationId: station.id,
      gameType: station.gameType,
      players: [session.players[0], session.players[1]],
      createdAt: session.createdAt,
      status: session.status,
      readyPlayerIds: [...session.ready],
      score: session.match.score,
      targetScore: PONG_RULES.targetScore,
      winnerId: session.winnerId,
      endReason: session.endReason,
      countdownMs: session.status === 'COUNTDOWN' ? remaining(session.countdownEndsAt) : null,
      pausedPlayerId: session.status === 'PAUSED' ? session.pausedPlayerId : null,
      graceMs: session.status === 'PAUSED' ? remaining(session.pauseEndsAt) : null,
      decisionMs: session.status === 'READY' || session.status === 'ENDED' ? remaining(session.decisionEndsAt) : null,
    };
  }
}

function recordKey(officeId: UUID, stationId: string): string {
  return `${officeId}\u0000${stationId}`;
}

function seatKey(officeId: UUID, employeeId: UUID): string {
  return `${officeId}\u0000${employeeId}`;
}
