import { Logger } from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import {
  ClientToServerEvents,
  Direction,
  InterServerEvents,
  OfficeJoinPayload,
  OfficeLeavePayload,
  PlayerJoinedPayload,
  PlayerLeftPayload,
  PlayerMovePayload,
  ServerToClientEvents,
  SOCKET_EVENTS,
  SocketData,
  Vector2,
} from '@virtual-office/shared';
import { AuthService } from '../auth/auth.service';
import { PresenceService } from '../presence/presence.service';
import { OfficePresenceRegistry } from './office-presence.registry';

type OfficeSocket = Socket<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>;
type OfficeServer = Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>;

const DIRECTIONS: readonly Direction[] = ['up', 'down', 'left', 'right'];
const MAX_COORDINATE = 20_000;

/**
 * Realtime networking here is simple server-authoritative broadcast only:
 * the server relays `player:move` as `player:position` to everyone else in
 * the office. There is deliberately no client-side prediction, reconciliation,
 * or lag compensation — keep it that way unless a real requirement forces it.
 *
 * Identity comes exclusively from the JWT presented in the Socket.IO handshake
 * (`auth.token`); payload `employeeId`s are only accepted when they match it.
 * One Socket.IO room per office (`officeId`) scopes every broadcast.
 */
@WebSocketGateway({
  cors: {
    origin: true,
    credentials: true,
  },
})
export class OfficeGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(OfficeGateway.name);

  @WebSocketServer()
  server!: OfficeServer;

  constructor(
    private readonly presenceService: PresenceService,
    private readonly authService: AuthService,
    private readonly registry: OfficePresenceRegistry,
  ) {}

  afterInit(server: OfficeServer): void {
    server.use((socket, next) => {
      const token: unknown = socket.handshake.auth?.token;
      const claims = typeof token === 'string' ? this.authService.verifyToken(token) : null;
      if (!claims) {
        next(new Error('unauthorized'));
        return;
      }
      socket.data.employeeId = claims.employeeId;
      socket.data.organizationId = claims.organizationId;
      next();
    });
  }

  handleConnection(client: OfficeSocket): void {
    this.logger.debug(`Socket connected: ${client.id} (employee ${client.data.employeeId})`);
  }

  handleDisconnect(client: OfficeSocket): void {
    const { employeeId, officeId } = client.data;
    if (employeeId) {
      void this.presenceService.handleDisconnect(employeeId, client.id);
    }
    if (officeId && employeeId && this.registry.remove(officeId, employeeId, client.id)) {
      const payload: PlayerLeftPayload = { employeeId };
      client.to(officeId).emit(SOCKET_EVENTS.PLAYER_LEFT, payload);
    }
    this.logger.debug(`Socket disconnected: ${client.id}`);
  }

  @SubscribeMessage(SOCKET_EVENTS.OFFICE_JOIN)
  handleOfficeJoin(
    @ConnectedSocket() client: OfficeSocket,
    @MessageBody() payload: OfficeJoinPayload,
  ): void {
    const employeeId = client.data.employeeId;
    if (!payload?.officeId || payload.employeeId !== employeeId) {
      this.logger.warn(`Rejected office:join from ${client.id}: identity mismatch`);
      return;
    }
    // TODO: verify the employee's organization owns this office before allowing the join.

    const officeId = payload.officeId;
    void client.join(officeId);
    client.data.officeId = officeId;
    void this.presenceService.handleConnect(employeeId, client.id);

    const position = isValidPosition(payload.position) ? payload.position : { x: 0, y: 0 };
    const direction = isDirection(payload.direction) ? payload.direction : 'down';

    for (const member of this.registry.others(officeId, employeeId)) {
      const existing: PlayerJoinedPayload = {
        employeeId: member.employeeId,
        position: member.position,
        direction: member.direction,
      };
      client.emit(SOCKET_EVENTS.PLAYER_JOINED, existing);
    }

    this.registry.upsert(officeId, { employeeId, socketId: client.id, position, direction });

    const joinedPayload: PlayerJoinedPayload = { employeeId, position, direction };
    client.to(officeId).emit(SOCKET_EVENTS.PLAYER_JOINED, joinedPayload);
  }

  @SubscribeMessage(SOCKET_EVENTS.OFFICE_LEAVE)
  handleOfficeLeave(
    @ConnectedSocket() client: OfficeSocket,
    @MessageBody() payload: OfficeLeavePayload,
  ): void {
    const { employeeId } = client.data;
    if (!payload?.officeId || payload.employeeId !== employeeId) return;

    void client.leave(payload.officeId);
    if (this.registry.remove(payload.officeId, employeeId, client.id)) {
      const leftPayload: PlayerLeftPayload = { employeeId };
      client.to(payload.officeId).emit(SOCKET_EVENTS.PLAYER_LEFT, leftPayload);
    }
  }

  @SubscribeMessage(SOCKET_EVENTS.PLAYER_MOVE)
  handlePlayerMove(
    @ConnectedSocket() client: OfficeSocket,
    @MessageBody() payload: PlayerMovePayload,
  ): void {
    const { officeId, employeeId } = client.data;
    if (!officeId || payload?.employeeId !== employeeId) return;
    if (!isValidPosition(payload.position) || !isDirection(payload.direction)) return;

    // TODO: validate movement speed against the last known position before trusting it.
    this.registry.updatePosition(officeId, employeeId, payload.position, payload.direction);
    client.to(officeId).emit(SOCKET_EVENTS.PLAYER_POSITION, {
      employeeId,
      position: payload.position,
      direction: payload.direction,
      mode: 'MANUAL',
    });
  }
}

function isValidPosition(position: Vector2 | undefined): position is Vector2 {
  return (
    !!position &&
    Number.isFinite(position.x) &&
    Number.isFinite(position.y) &&
    Math.abs(position.x) <= MAX_COORDINATE &&
    Math.abs(position.y) <= MAX_COORDINATE
  );
}

function isDirection(value: unknown): value is Direction {
  return typeof value === 'string' && (DIRECTIONS as readonly string[]).includes(value);
}
