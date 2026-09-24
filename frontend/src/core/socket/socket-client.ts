import type { ClientToServerEvents, ServerToClientEvents } from '@virtual-office/shared';
import { type Socket, io } from 'socket.io-client';

import { runtimeEnv } from '@/core/config';

export type TypedSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

const MAX_RECONNECT_ATTEMPTS = 4;

/**
 * Strongly typed Socket.IO client wrapper. This is the ONLY place a raw
 * `socket.io-client` instance is created. The handshake carries the platform
 * JWT (real login or demo session); the backend rejects sockets without one.
 * Reconnection is bounded so an unavailable backend cannot flood the console.
 */
class SocketClient {
  private socket: TypedSocket | null = null;
  private authToken: string | null = null;

  setAuthToken(token: string | null): void {
    this.authToken = token;
  }

  hasAuthToken(): boolean {
    return this.authToken !== null;
  }

  connect(): TypedSocket {
    if (this.socket) return this.socket;
    this.socket = io(runtimeEnv.socketUrl, {
      autoConnect: true,
      transports: ['websocket'],
      auth: { token: this.authToken },
      reconnectionAttempts: MAX_RECONNECT_ATTEMPTS,
      reconnectionDelay: 1500,
      timeout: 5000,
    }) as TypedSocket;
    return this.socket;
  }

  disconnect(): void {
    this.socket?.removeAllListeners();
    this.socket?.disconnect();
    this.socket = null;
  }

  getSocket(): TypedSocket | null {
    return this.socket;
  }
}

export const socketClient = new SocketClient();
