import type { ClientToServerEvents, ServerToClientEvents } from '@virtual-office/shared';

import type { RealtimeConnectionStatus } from '@/game/bridge/GameEvents';
import { socketClient, type TypedSocket } from '@/core/socket';

/**
 * Game-side wrapper around `core/socket`. OfficeScene and its systems must
 * go through this (never import `core/socket` or `socket.io-client`
 * directly) so all networking logic stays out of the scene per the
 * architecture rule.
 */
export class OfficeSocket {
  private socket: TypedSocket | null = null;

  constructor(private readonly onStatus: (status: RealtimeConnectionStatus) => void) {}

  connect(onConnected: () => void, onDisconnected: () => void): void {
    this.onStatus('connecting');
    const socket = socketClient.connect();
    this.socket = socket;
    socket.on('connect', () => {
      this.onStatus('connected');
      onConnected();
    });
    socket.on('disconnect', () => {
      this.onStatus('disconnected');
      onDisconnected();
    });
    socket.on('connect_error', () => this.onStatus('disconnected'));
  }

  disconnect(): void {
    socketClient.disconnect();
    this.socket = null;
  }

  emit<K extends keyof ClientToServerEvents>(event: K, ...args: Parameters<ClientToServerEvents[K]>): void {
    if (this.socket?.connected) this.socket.emit(event, ...args);
  }

  on<K extends keyof ServerToClientEvents>(event: K, handler: ServerToClientEvents[K]): void {
    this.socket?.on(event, handler as never);
  }

  off<K extends keyof ServerToClientEvents>(event: K, handler: ServerToClientEvents[K]): void {
    this.socket?.off(event, handler as never);
  }
}
