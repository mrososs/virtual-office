import type { ClientToServerEvents, RealtimeTicketResponse, ServerToClientEvents } from '@virtual-office/shared';
import { type Socket, io } from 'socket.io-client';

import { httpClient } from '@/core/api';
import { runtimeEnv } from '@/core/config';

export type TypedSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

type ServerEvent = keyof ServerToClientEvents;
type ConnectErrorHandler = (error: Error, willRetry: boolean) => void;

/** Demo mode without a backend should stay quiet; production keeps trying until the server is back. */
const DEMO_RECONNECT_ATTEMPTS = 4;

/**
 * Strongly typed Socket.IO client wrapper. This is the ONLY place a raw
 * `socket.io-client` instance is created. Production sockets authenticate
 * with the HttpOnly session cookie (same origin, `withCredentials`); the
 * backend decides who you are. When the socket host is another site than
 * the app (VITE_SOCKET_URL, e.g. SPA on Vercel + API on Railway) the cookie
 * can't reach it, so every connection attempt first trades it — through the
 * same-origin API — for a single-use, 60-second ticket. Demo mode instead
 * hands over a demo token.
 *
 * Vue code subscribes to server events through `on()`: subscriptions are kept
 * here and re-attached whenever the game layer (re)creates the socket.
 */
class SocketClient {
  private socket: TypedSocket | null = null;
  private demoToken: string | null = null;
  private readonly listeners = new Map<ServerEvent, Set<(...args: never[]) => void>>();
  private readonly connectErrorHandlers = new Set<ConnectErrorHandler>();
  /** Handshakes the server refused as "unavailable" in a row (backoff for manual retries). */
  private refusedAttempts = 0;
  private retryTimer = 0;

  /** Demo mode only — production never sends a token (the cookie is the credential). */
  setAuthToken(token: string | null): void {
    this.demoToken = token;
  }

  connect(): TypedSocket {
    if (this.socket) return this.socket;
    // Demo: the demo token. Socket host on another site: a fresh ticket per attempt. Same origin: the cookie alone.
    const auth = this.demoToken
      ? { token: this.demoToken }
      : runtimeEnv.socketUrl
        ? (send: (data: object) => void) => void this.realtimeTicket().then(send)
        : {};
    const options = {
      autoConnect: true,
      transports: ['websocket'],
      withCredentials: true,
      auth,
      reconnectionAttempts: runtimeEnv.demoMode ? DEMO_RECONNECT_ATTEMPTS : Number.POSITIVE_INFINITY,
      reconnectionDelay: 1500,
      reconnectionDelayMax: 15_000,
      timeout: 5000,
    };
    const socket = (runtimeEnv.socketUrl ? io(runtimeEnv.socketUrl, options) : io(options)) as TypedSocket;
    for (const [event, handlers] of this.listeners) {
      for (const handler of handlers) socket.on(event, handler as never);
    }
    socket.on('connect', () => (this.refusedAttempts = 0));
    socket.on('connect_error', (error) => {
      // `active` is false when the server refused the handshake: Socket.IO will not retry that on its own.
      // 'unavailable' means the server could not check the session right now, so retry with backoff.
      if (!socket.active && error.message === 'unavailable') this.retryRefused(socket);
      for (const handler of this.connectErrorHandlers) handler(error, socket.active || error.message === 'unavailable');
    });
    this.socket = socket;
    return socket;
  }

  disconnect(): void {
    window.clearTimeout(this.retryTimer);
    this.socket?.removeAllListeners();
    this.socket?.disconnect();
    this.socket = null;
  }

  /** Called on every (re)connection attempt; without a ticket the server answers 'unauthorized' like a missing cookie. */
  private async realtimeTicket(): Promise<{ ticket?: string }> {
    try {
      const { ticket } = await httpClient.post<RealtimeTicketResponse>('/auth/realtime-ticket');
      return { ticket };
    } catch {
      return {};
    }
  }

  private retryRefused(socket: TypedSocket): void {
    window.clearTimeout(this.retryTimer);
    const delay = Math.min(30_000, 2000 * 2 ** this.refusedAttempts);
    this.refusedAttempts += 1;
    this.retryTimer = window.setTimeout(() => {
      if (this.socket === socket && !socket.connected) socket.connect();
    }, delay);
  }

  getSocket(): TypedSocket | null {
    return this.socket;
  }

  /** Subscribes to a server event now and on every future socket. Returns the unsubscribe function. */
  on<K extends ServerEvent>(event: K, handler: ServerToClientEvents[K]): () => void {
    const handlers = this.listeners.get(event) ?? new Set();
    handlers.add(handler as never);
    this.listeners.set(event, handlers);
    this.socket?.on(event, handler as never);
    return () => {
      handlers.delete(handler as never);
      this.socket?.off(event, handler as never);
    };
  }

  onConnectError(handler: ConnectErrorHandler): () => void {
    this.connectErrorHandlers.add(handler);
    return () => this.connectErrorHandlers.delete(handler);
  }
}

export const socketClient = new SocketClient();
