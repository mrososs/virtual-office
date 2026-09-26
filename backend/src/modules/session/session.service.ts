import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { RealtimeTicketResponse, UUID } from '@virtual-office/shared';
import type { CookieOptions, Request, Response } from 'express';
import { CryptoService } from '../../common/security/crypto.service';
import { SupabaseService } from '../../common/supabase/supabase.service';
import { AppConfig } from '../../config/configuration';
import { SessionEvents } from './session-events';
import { SessionRepository } from './session.repository';
import type { AppSession, AuthContext, SessionEndReason } from './session.types';

const HOUR_MS = 60 * 60_000;
/** Refreshing last_seen_at on every request would be a write per call; a few minutes of slack is plenty for a 7-day idle timeout. */
const TOUCH_INTERVAL_MS = 5 * 60_000;
const SWEEP_INTERVAL_MS = HOUR_MS;
const REALTIME_TICKET_TTL_MS = 60_000;
const TICKET_VERSION = 'rt1';
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Application sessions: an opaque random token in an HttpOnly, SameSite=Lax
 * cookie (Secure + `__Host-` over HTTPS), backed by an `app_sessions` row that
 * stores only a keyed hash of it. Microsoft tokens are never part of the
 * session — the browser/PWA holds nothing but this cookie.
 *
 * Policy: sliding idle timeout (SESSION_IDLE_TIMEOUT_HOURS, default 7 days)
 * inside an absolute lifetime (SESSION_ABSOLUTE_TIMEOUT_DAYS, default 30 days).
 * Disabling an employee ends their sessions at the next request.
 */
@Injectable()
export class SessionService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(SessionService.name);
  private readonly config: AppConfig['session'];
  private sweepTimer: NodeJS.Timeout | null = null;
  /** Signatures of realtime tickets already used, until they expire (one backend instance). */
  private readonly usedTickets = new Map<string, number>();

  constructor(
    configService: ConfigService,
    private readonly repository: SessionRepository,
    private readonly crypto: CryptoService,
    private readonly events: SessionEvents,
    private readonly supabase: SupabaseService,
  ) {
    this.config = configService.get<AppConfig>('app')!.session;
  }

  onModuleInit(): void {
    if (!this.supabase.isConfigured()) return;
    this.sweepTimer = setInterval(() => void this.sweepExpired(), SWEEP_INTERVAL_MS);
    this.sweepTimer.unref();
  }

  onModuleDestroy(): void {
    if (this.sweepTimer) clearInterval(this.sweepTimer);
  }

  async start(employeeId: UUID, userAgent: string | null): Promise<{ token: string; session: AppSession }> {
    const token = this.crypto.randomToken(32);
    const expiresAt = new Date(Date.now() + this.config.absoluteTimeoutDays * 24 * HOUR_MS).toISOString();
    const session = await this.repository.create({
      employeeId,
      tokenHash: this.crypto.hashSessionToken(token),
      expiresAt,
      userAgent: userAgent?.slice(0, 400) ?? null,
    });
    return { token, session };
  }

  /** The live session behind a cookie value, or null (missing, unknown, expired, idle, or employee disabled). */
  async resolve(token: string | null | undefined): Promise<AuthContext | null> {
    if (!token || token.length > 200) return null;
    const context = await this.repository.findByTokenHash(this.crypto.hashSessionToken(token));
    return context ? this.checkLive(context) : null;
  }

  /* Realtime tickets --------------------------------------------------------- */

  /**
   * When the SPA and the Socket.IO host are different sites (Vercel + Railway),
   * the SameSite cookie never reaches the socket. The SPA trades it — over the
   * same-origin, cookie-authenticated API — for this ticket: HMAC-signed,
   * bound to one session, valid 60 s, accepted once. The socket then gets the
   * same checks as a cookie (session alive, employee active).
   */
  issueRealtimeTicket(session: AppSession): RealtimeTicketResponse {
    const expiresAtMs = Date.now() + REALTIME_TICKET_TTL_MS;
    const payload = [TICKET_VERSION, session.id, String(expiresAtMs), this.crypto.randomToken(12)].join('.');
    return { ticket: `${payload}.${this.crypto.signRealtimeTicket(payload)}`, expiresAt: new Date(expiresAtMs).toISOString() };
  }

  async resolveRealtimeTicket(ticket: string): Promise<AuthContext | null> {
    const parts = ticket.length <= 300 ? ticket.split('.') : [];
    if (parts.length !== 5 || parts[0] !== TICKET_VERSION || !UUID_PATTERN.test(parts[1] ?? '')) return null;
    const signature = parts[4] ?? '';
    if (!this.crypto.safeEqual(signature, this.crypto.signRealtimeTicket(parts.slice(0, 4).join('.')))) return null;

    const now = Date.now();
    const expiresAtMs = Number(parts[2]);
    if (!Number.isFinite(expiresAtMs) || expiresAtMs <= now || expiresAtMs > now + REALTIME_TICKET_TTL_MS) return null;
    for (const [used, expiry] of this.usedTickets) if (expiry <= now) this.usedTickets.delete(used);
    if (this.usedTickets.has(signature)) return null;
    this.usedTickets.set(signature, expiresAtMs);

    const context = await this.repository.findById(parts[1]!);
    return context ? this.checkLive(context) : null;
  }

  /** Ends sessions that are past their absolute or idle limit, or whose employee was disabled; touches the rest. */
  private async checkLive(context: AuthContext): Promise<AuthContext | null> {
    const now = Date.now();
    const lastSeen = new Date(context.session.lastSeenAt).getTime();
    const expired = new Date(context.session.expiresAt).getTime() <= now || lastSeen + this.config.idleTimeoutHours * HOUR_MS <= now;
    if (expired || !context.employee.isActive) {
      await this.end(context.session, expired ? 'EXPIRED' : 'DISABLED');
      return null;
    }

    if (now - lastSeen > TOUCH_INTERVAL_MS) {
      const at = new Date(now).toISOString();
      await this.repository.touch(context.session.id, at);
      context.session.lastSeenAt = at;
    }
    return context;
  }

  async end(session: Pick<AppSession, 'id' | 'employeeId'>, reason: SessionEndReason): Promise<void> {
    await this.repository.delete(session.id);
    this.events.emitEnded({ sessionId: session.id, employeeId: session.employeeId, reason });
  }

  /* Cookies ---------------------------------------------------------------- */

  readToken(request: Request): string | null {
    const value: unknown = request.cookies?.[this.config.cookieName];
    return typeof value === 'string' ? value : null;
  }

  /** Same as `readToken`, for a raw `Cookie` header (Socket.IO handshakes). */
  readTokenFromCookieHeader(header: string | undefined): string | null {
    if (!header) return null;
    for (const part of header.split(';')) {
      const separator = part.indexOf('=');
      if (separator === -1) continue;
      if (part.slice(0, separator).trim() !== this.config.cookieName) continue;
      try {
        return decodeURIComponent(part.slice(separator + 1).trim());
      } catch {
        return null;
      }
    }
    return null;
  }

  writeCookie(response: Response, token: string, session: AppSession): void {
    response.cookie(this.config.cookieName, token, { ...this.cookieOptions(), expires: new Date(session.expiresAt) });
  }

  clearCookie(response: Response): void {
    response.clearCookie(this.config.cookieName, this.cookieOptions());
  }

  private cookieOptions(): CookieOptions {
    return { httpOnly: true, secure: this.config.secureCookies, sameSite: 'lax', path: '/' };
  }

  private async sweepExpired(): Promise<void> {
    try {
      const now = Date.now();
      const removed = await this.repository.deleteExpired(new Date(now).toISOString(), new Date(now - this.config.idleTimeoutHours * HOUR_MS).toISOString());
      if (removed > 0) this.logger.log(`Removed ${removed} expired session(s)`);
    } catch (error) {
      this.logger.warn(`Session sweep failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}
