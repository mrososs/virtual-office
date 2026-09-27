import { SOCKET_EVENTS, type GameErrorPayload, type GameSession, type GameStationState, type PongDirection } from '@virtual-office/shared';

import { socketClient } from '@/core/socket';

/**
 * Game Room requests over the office socket. Payloads name a station, a
 * room or a match — never a player: the server takes identity from the
 * authenticated socket. Every call returns false when the socket is not connected.
 */
export const gameRoomClient = {
  sync: (): boolean => socketClient.emit(SOCKET_EVENTS.GAME_SYNC),
  joinTable: (stationId: string): boolean => socketClient.emit(SOCKET_EVENTS.GAME_JOIN_TABLE, { stationId }),
  leaveTable: (stationId: string): boolean => socketClient.emit(SOCKET_EVENTS.GAME_LEAVE_TABLE, { stationId }),
  /** External games (host): the room link or code created on the provider's site. The server validates it. */
  shareRoom: (stationId: string, invite: string): boolean => socketClient.emit(SOCKET_EVENTS.GAME_SHARE_ROOM, { stationId, invite }),
  /** Internal Pong only. */
  ready: (sessionId: string): boolean => socketClient.emit(SOCKET_EVENTS.GAME_READY, { sessionId }),
  /** Internal Pong only. */
  input: (sessionId: string, direction: PongDirection): boolean => socketClient.emit(SOCKET_EVENTS.GAME_INPUT, { sessionId, direction }),
};

export interface GameRoomHandlers {
  onStations(stations: GameStationState[]): void;
  onStation(station: GameStationState): void;
  onSession(session: GameSession | null): void;
  onError(error: GameErrorPayload): void;
}

/** Subscribes to the low-frequency Game Room events. Returns the unsubscribe function. */
export function subscribeGameRoom(handlers: GameRoomHandlers): () => void {
  const unsubscribers = [
    socketClient.on(SOCKET_EVENTS.GAME_STATIONS, ({ stations }) => handlers.onStations(stations)),
    socketClient.on(SOCKET_EVENTS.GAME_STATION_UPDATED, (station) => handlers.onStation(station)),
    socketClient.on(SOCKET_EVENTS.GAME_SESSION, ({ session }) => handlers.onSession(session)),
    socketClient.on(SOCKET_EVENTS.GAME_ERROR, (error) => handlers.onError(error)),
  ];
  return () => {
    for (const unsubscribe of unsubscribers) unsubscribe();
  };
}
