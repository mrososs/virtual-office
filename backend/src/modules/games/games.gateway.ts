import { Logger, OnModuleInit } from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import {
  SOCKET_EVENTS,
  type ClientToServerEvents,
  type GameErrorCode,
  type GameInputPayload,
  type GameReadyPayload,
  type GameShareRoomPayload,
  type GameStationRequestPayload,
  type InterServerEvents,
  type PongDirection,
  type ServerToClientEvents,
  type SocketData,
  type UUID,
} from '@virtual-office/shared';
import type { Server, Socket } from 'socket.io';

import { GameActionError, GameSessionManager } from './game-session.manager';
import { SocketRateLimiter } from './socket-rate-limiter';

type OfficeSocket = Socket<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>;
type OfficeServer = Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>;

const MAX_ID_LENGTH = 64;
const MAX_INVITE_LENGTH = 512;
const DIRECTIONS: readonly PongDirection[] = [-1, 0, 1];

/**
 * Game Room coordination on the office's own Socket.IO server (Nest shares
 * one server between gateways on the same port and namespace). Low-frequency
 * events only — who sits where, the room each player should open — except
 * for internal Pong, whose snapshots flow only while such a match runs. The handshake is
 * authenticated by OfficeGateway's middleware — session cookie, realtime
 * ticket, or (demo mode only) a demo token — so every socket here already
 * carries a server-decided `employeeId`. Game events additionally require an
 * office join, and never read an employee id from a payload.
 *
 * Every socket joins a private room per employee, so an employee's tabs all
 * see the same match, and a match survives as long as any of them is open.
 */
@WebSocketGateway({
  cors: { origin: true, credentials: true },
})
export class GamesGateway implements OnGatewayConnection, OnGatewayDisconnect, OnModuleInit {
  private readonly logger = new Logger(GamesGateway.name);
  private readonly controlLimiter = new SocketRateLimiter(12, 3);
  private readonly inputLimiter = new SocketRateLimiter(40, 30);
  /** The office each socket used for games (OfficeGateway clears `data.officeId` on disconnect before we may run). */
  private readonly officeBySocket = new Map<string, UUID>();

  @WebSocketServer()
  server!: OfficeServer;

  constructor(private readonly games: GameSessionManager) {}

  onModuleInit(): void {
    this.games.setBroadcaster({
      stationChanged: (officeId, state) => this.server?.to(officeId).emit(SOCKET_EVENTS.GAME_STATION_UPDATED, state),
      // Per employee: each player's view carries only their own room link.
      session: (employeeId, session) => this.server?.to(employeeRoom(employeeId)).emit(SOCKET_EVENTS.GAME_SESSION, { session }),
      // Volatile: a snapshot that can't be written right now is dropped; the next one supersedes it anyway.
      state: (employeeIds, state) => this.server?.to(employeeIds.map(employeeRoom)).volatile.emit(SOCKET_EVENTS.GAME_STATE, state),
      notice: (employeeId, code, message) => this.server?.to(employeeRoom(employeeId)).emit(SOCKET_EVENTS.GAME_ERROR, { code, message }),
    });
  }

  handleConnection(client: OfficeSocket): void {
    const employeeId = client.data.employeeId;
    if (employeeId) void client.join(employeeRoom(employeeId));
  }

  handleDisconnect(client: OfficeSocket): void {
    this.controlLimiter.forget(client.id);
    this.inputLimiter.forget(client.id);
    const officeId = this.officeBySocket.get(client.id);
    this.officeBySocket.delete(client.id);
    const employeeId = client.data.employeeId;
    if (!officeId || !employeeId) return;
    // Socket.IO removes a socket from its rooms before "disconnect": what's left are the employee's other tabs.
    const stillConnected = [...(this.server.sockets.adapter.rooms.get(employeeRoom(employeeId)) ?? [])].some(
      (socketId) => this.officeBySocket.get(socketId) === officeId || this.server.sockets.sockets.get(socketId)?.data.officeId === officeId,
    );
    if (!stillConnected) this.games.connectionLost(officeId, employeeId);
  }

  @SubscribeMessage(SOCKET_EVENTS.GAME_SYNC)
  handleSync(@ConnectedSocket() client: OfficeSocket): void {
    const player = this.control(client);
    if (!player) return;
    const { stations, session } = this.games.sync(player.officeId, player.employeeId);
    client.emit(SOCKET_EVENTS.GAME_STATIONS, { stations });
    client.emit(SOCKET_EVENTS.GAME_SESSION, { session });
  }

  @SubscribeMessage(SOCKET_EVENTS.GAME_JOIN_TABLE)
  handleJoin(@ConnectedSocket() client: OfficeSocket, @MessageBody() payload: GameStationRequestPayload): void {
    const player = this.control(client);
    if (player) this.run(client, () => this.games.join(player.officeId, player.employeeId, boundedId(payload?.stationId)));
  }

  @SubscribeMessage(SOCKET_EVENTS.GAME_LEAVE_TABLE)
  handleLeave(@ConnectedSocket() client: OfficeSocket, @MessageBody() payload: GameStationRequestPayload): void {
    const player = this.control(client);
    if (player) this.run(client, () => this.games.leave(player.officeId, player.employeeId, boundedId(payload?.stationId)));
  }

  @SubscribeMessage(SOCKET_EVENTS.GAME_SHARE_ROOM)
  handleShareRoom(@ConnectedSocket() client: OfficeSocket, @MessageBody() payload: GameShareRoomPayload): void {
    const player = this.control(client);
    const invite = typeof payload?.invite === 'string' && payload.invite.length <= MAX_INVITE_LENGTH ? payload.invite : null;
    if (player) this.run(client, () => this.games.shareRoom(player.officeId, player.employeeId, boundedId(payload?.stationId), invite));
  }

  @SubscribeMessage(SOCKET_EVENTS.GAME_READY)
  handleReady(@ConnectedSocket() client: OfficeSocket, @MessageBody() payload: GameReadyPayload): void {
    const player = this.control(client);
    if (player) this.run(client, () => this.games.ready(player.officeId, player.employeeId, boundedId(payload?.sessionId)));
  }

  @SubscribeMessage(SOCKET_EVENTS.GAME_INPUT)
  handleInput(@ConnectedSocket() client: OfficeSocket, @MessageBody() payload: GameInputPayload): void {
    const player = this.playerOf(client);
    if (!player || !this.inputLimiter.allow(client.id)) return;
    const direction = payload?.direction;
    if (!DIRECTIONS.includes(direction)) return;
    this.games.input(player.officeId, player.employeeId, boundedId(payload.sessionId), direction);
  }

  /* Internals ---------------------------------------------------------------- */

  /** The authenticated identity behind a socket that has joined an office, or null. */
  private playerOf(client: OfficeSocket): { employeeId: UUID; officeId: UUID } | null {
    const { employeeId, officeId } = client.data;
    if (!employeeId || !officeId) return null;
    this.officeBySocket.set(client.id, officeId);
    return { employeeId, officeId };
  }

  private control(client: OfficeSocket): { employeeId: UUID; officeId: UUID } | null {
    const player = this.playerOf(client);
    if (!player) {
      this.reject(client, 'NOT_IN_OFFICE', 'Join the office before using the Game Room.');
      return null;
    }
    if (!this.controlLimiter.allow(client.id)) {
      this.reject(client, 'RATE_LIMITED', 'Slow down a little.');
      return null;
    }
    return player;
  }

  private run(client: OfficeSocket, action: () => void): void {
    try {
      action();
    } catch (error) {
      if (error instanceof GameActionError) this.reject(client, error.code, error.message);
      else {
        this.logger.error(`Game action failed: ${error instanceof Error ? error.message : String(error)}`);
        this.reject(client, 'STALE_SESSION', 'Something went wrong at the table. Try again.');
      }
    }
  }

  private reject(client: OfficeSocket, code: GameErrorCode, message: string): void {
    client.emit(SOCKET_EVENTS.GAME_ERROR, { code, message });
  }
}

function employeeRoom(employeeId: UUID): string {
  return `employee:${employeeId}`;
}

/** Ids from the client are only ever looked up, never stored; anything odd simply doesn't match. */
function boundedId(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 && value.length <= MAX_ID_LENGTH ? value : null;
}
