import { Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
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
  AvatarProfile,
  ClientToServerEvents,
  Direction,
  EmployeePresenceChangedPayload,
  InterServerEvents,
  normalizeAvatarProfile,
  OfficeJoinPayload,
  OfficeLeavePayload,
  PlayerAvatarUpdatedPayload,
  PlayerJoinedPayload,
  PlayerLeftPayload,
  PlayerMovePayload,
  ServerToClientEvents,
  SOCKET_EVENTS,
  SocketData,
  Vector2,
} from '@virtual-office/shared';
import type { Subscription } from 'rxjs';
import { AppConfig } from '../../config/configuration';
import { ActivityEngine } from '../activities/activity-engine.service';
import { WorkSyncEvents } from '../azure-devops/work-sync-events';
import { DemoTokenService } from '../demo/demo-token.service';
import { PresenceService } from '../presence/presence.service';
import { SessionEvents } from '../session/session-events';
import { SessionService } from '../session/session.service';
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
 * Identity is decided here, never by the client: production sockets present
 * the HttpOnly session cookie in the handshake, or — when the SPA is served
 * from another site (Vercel + Railway) — a single-use realtime ticket
 * (`auth.ticket`) minted from that session; in demo mode only, a demo token
 * (`auth.token`) is accepted instead. Payload `employeeId`s must match.
 * One Socket.IO room per office scopes every broadcast. Presence (DB) and
 * domain broadcasts (activity, work sync) apply to session sockets only.
 */
@WebSocketGateway({
  // The handshake middleware enforces APP_URL's origin (decorator options cannot read config).
  cors: { origin: true, credentials: true },
})
export class OfficeGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect, OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(OfficeGateway.name);
  private readonly app: AppConfig;
  /** Sockets currently counted in `employee_presence` (so leave + disconnect never decrement twice). */
  private readonly countedSockets = new Set<string>();
  private subscriptions: Subscription[] = [];

  @WebSocketServer()
  server!: OfficeServer;

  constructor(
    configService: ConfigService,
    private readonly presenceService: PresenceService,
    private readonly sessions: SessionService,
    private readonly sessionEvents: SessionEvents,
    private readonly demoTokens: DemoTokenService,
    private readonly registry: OfficePresenceRegistry,
    private readonly activityEngine: ActivityEngine,
    private readonly workSyncEvents: WorkSyncEvents,
  ) {
    this.app = configService.get<AppConfig>('app')!;
  }

  onModuleInit(): void {
    const officeId = this.app.organization.officeId;
    this.subscriptions = [
      this.sessionEvents.ended$.subscribe(({ sessionId, reason }) => this.closeSessionSockets(sessionId, reason)),
      this.activityEngine.changes$.subscribe((payload) => this.server?.to(officeId).emit(SOCKET_EVENTS.EMPLOYEE_ACTIVITY_CHANGED, payload)),
      this.workSyncEvents.synced$.subscribe((payload) => this.server?.to(officeId).emit(SOCKET_EVENTS.WORK_SYNCED, payload)),
    ];
  }

  onModuleDestroy(): void {
    for (const subscription of this.subscriptions) subscription.unsubscribe();
  }

  afterInit(server: OfficeServer): void {
    server.use((socket, next) => {
      this.authenticate(socket).then(
        () => next(),
        (error: unknown) => next(error instanceof Error ? error : new Error('unauthorized')),
      );
    });
  }

  handleConnection(client: OfficeSocket): void {
    this.logger.debug(`Socket connected: ${client.id} (employee ${client.data.employeeId})`);
  }

  handleDisconnect(client: OfficeSocket): void {
    void this.leaveOffice(client);
    this.logger.debug(`Socket disconnected: ${client.id}`);
  }

  @SubscribeMessage(SOCKET_EVENTS.OFFICE_JOIN)
  async handleOfficeJoin(@ConnectedSocket() client: OfficeSocket, @MessageBody() payload: OfficeJoinPayload): Promise<void> {
    const employeeId = client.data.employeeId;
    if (!payload?.officeId || payload.employeeId !== employeeId || client.data.officeId) {
      this.logger.warn(`Rejected office:join from ${client.id}: identity mismatch or already joined`);
      return;
    }
    const isSession = Boolean(client.data.sessionId);
    if (isSession && payload.officeId !== this.app.organization.officeId) {
      this.logger.warn(`Rejected office:join from ${client.id}: unknown office ${payload.officeId}`);
      return;
    }

    const officeId = payload.officeId;
    void client.join(officeId);
    client.data.officeId = officeId;

    const position = isValidPosition(payload.position) ? payload.position : { x: 0, y: 0 };
    const direction = isDirection(payload.direction) ? payload.direction : 'down';
    const avatar = sanitizeAvatar(payload.avatar, employeeId);

    for (const member of this.registry.others(officeId, employeeId)) {
      const existing: PlayerJoinedPayload = {
        employeeId: member.employeeId,
        position: member.position,
        direction: member.direction,
        avatar: member.avatar,
      };
      client.emit(SOCKET_EVENTS.PLAYER_JOINED, existing);
    }

    const firstConnection = this.registry.join(officeId, { employeeId, socketId: client.id, position, direction, avatar });
    if (firstConnection) {
      const joinedPayload: PlayerJoinedPayload = { employeeId, position, direction, avatar };
      client.to(officeId).emit(SOCKET_EVENTS.PLAYER_JOINED, joinedPayload);
    }

    if (isSession) {
      this.countedSockets.add(client.id);
      try {
        const presence = await this.presenceService.connect(employeeId);
        if (firstConnection) this.broadcastPresence(officeId, { employeeId, presence });
      } catch (error) {
        this.logger.warn(`Presence connect failed for ${employeeId}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  }

  /**
   * Relays a saved avatar change to everyone else in the office and keeps it
   * for late joiners. Cosmetics are validated against the shared catalog, and
   * the owner is always the socket's employee.
   */
  @SubscribeMessage(SOCKET_EVENTS.PLAYER_AVATAR_UPDATE)
  handleAvatarUpdate(@ConnectedSocket() client: OfficeSocket, @MessageBody() payload: PlayerAvatarUpdatedPayload): void {
    const { officeId, employeeId } = client.data;
    if (!officeId || payload?.employeeId !== employeeId) return;
    const avatar = sanitizeAvatar(payload.avatar, employeeId);
    if (!avatar || !this.registry.updateAvatar(officeId, employeeId, avatar)) return;

    const updated: PlayerAvatarUpdatedPayload = { employeeId, avatar };
    client.to(officeId).emit(SOCKET_EVENTS.PLAYER_AVATAR_UPDATED, updated);
  }

  @SubscribeMessage(SOCKET_EVENTS.OFFICE_LEAVE)
  async handleOfficeLeave(@ConnectedSocket() client: OfficeSocket, @MessageBody() payload: OfficeLeavePayload): Promise<void> {
    if (!payload?.officeId || payload.employeeId !== client.data.employeeId || payload.officeId !== client.data.officeId) return;
    await this.leaveOffice(client);
  }

  @SubscribeMessage(SOCKET_EVENTS.PLAYER_MOVE)
  handlePlayerMove(@ConnectedSocket() client: OfficeSocket, @MessageBody() payload: PlayerMovePayload): void {
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

  /* Internals ---------------------------------------------------------------- */

  private async authenticate(socket: OfficeSocket): Promise<void> {
    const origin = socket.handshake.headers.origin;
    if (origin && origin !== this.app.appOrigin) throw new Error('forbidden origin');

    // Demo mode only: an explicit demo token (the demo frontend always sends one).
    const demoToken: unknown = socket.handshake.auth?.token;
    const demoClaims = typeof demoToken === 'string' ? this.demoTokens.verify(demoToken) : null;
    if (demoClaims) {
      socket.data.employeeId = demoClaims.employeeId;
      socket.data.organizationId = demoClaims.organizationId;
      return;
    }

    // Production: the application session — its cookie, or (SPA on another site) a realtime ticket
    // minted from it over the cookie-authenticated API. The client never names itself.
    const ticket: unknown = socket.handshake.auth?.ticket;
    const token = typeof ticket === 'string' ? null : this.sessions.readTokenFromCookieHeader(socket.handshake.headers.cookie);
    let auth: Awaited<ReturnType<SessionService['resolve']>> = null;
    try {
      if (typeof ticket === 'string') auth = await this.sessions.resolveRealtimeTicket(ticket);
      else if (token) auth = await this.sessions.resolve(token);
    } catch {
      // Infrastructure trouble, not a verdict on the session: the client retries 'unavailable' on its own.
      throw new Error('unavailable');
    }
    if (!auth) throw new Error('unauthorized');
    socket.data.employeeId = auth.employee.id;
    socket.data.organizationId = this.app.organization.id;
    socket.data.sessionId = auth.session.id;
  }

  private async leaveOffice(client: OfficeSocket): Promise<void> {
    const { officeId, employeeId } = client.data;
    if (!officeId || !employeeId) return;
    client.data.officeId = undefined;
    void client.leave(officeId);

    const lastConnection = this.registry.leave(officeId, employeeId, client.id);
    if (lastConnection) {
      const payload: PlayerLeftPayload = { employeeId };
      this.server.to(officeId).emit(SOCKET_EVENTS.PLAYER_LEFT, payload);
    }

    if (!this.countedSockets.delete(client.id)) return;
    try {
      const presence = await this.presenceService.disconnect(employeeId);
      if (presence.status === 'OFFLINE') this.broadcastPresence(officeId, { employeeId, presence });
    } catch (error) {
      this.logger.warn(`Presence disconnect failed for ${employeeId}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private broadcastPresence(officeId: string, payload: EmployeePresenceChangedPayload): void {
    this.server.to(officeId).emit(SOCKET_EVENTS.EMPLOYEE_PRESENCE_CHANGED, payload);
  }

  /** A signed-out / expired / disabled session must not keep a socket (or office presence) alive. */
  private closeSessionSockets(sessionId: string, reason: 'SIGNED_OUT' | 'EXPIRED' | 'DISABLED'): void {
    if (!this.server) return;
    for (const socket of this.server.sockets.sockets.values()) {
      if (socket.data.sessionId !== sessionId) continue;
      socket.emit(SOCKET_EVENTS.SESSION_ENDED, { reason });
      socket.disconnect(true);
    }
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

function sanitizeAvatar(value: unknown, employeeId: string): AvatarProfile | null {
  return typeof value === 'object' && value !== null ? normalizeAvatarProfile(value, employeeId) : null;
}

function isDirection(value: unknown): value is Direction {
  return typeof value === 'string' && (DIRECTIONS as readonly string[]).includes(value);
}
