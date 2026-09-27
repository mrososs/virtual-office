import type { GameStation, GameType } from '../types/game.types.js';

import { GAME_PROVIDER } from './game-providers.js';
import { HQ_ROOM } from './hq-floor-plan.js';

export const GAME_STATION = {
  pong01: 'game-pong-01',
  chess01: 'game-chess-01',
  ticTacToe01: 'game-tictactoe-01',
  connectFour01: 'game-connect4-01',
} as const;

/**
 * Every game station in the office. The backend accepts no station id that
 * is not listed here, and the floor plan places each one by id. Adding a
 * station is one entry here, a provider in `GAME_PROVIDERS` (or an internal
 * engine), and its spot in the frontend layout.
 */
export const GAME_STATIONS: readonly GameStation[] = [
  { id: GAME_STATION.pong01, gameType: 'PONG', name: 'Ping Pong Table', roomId: HQ_ROOM.game, capacity: 2, launchType: 'EXTERNAL_URL', providerId: GAME_PROVIDER.pixoplaysPong },
  { id: GAME_STATION.chess01, gameType: 'CHESS', name: 'Chess Table', roomId: HQ_ROOM.game, capacity: 2, launchType: 'EXTERNAL_URL', providerId: GAME_PROVIDER.lichess },
  { id: GAME_STATION.ticTacToe01, gameType: 'TIC_TAC_TOE', name: 'Tic-Tac-Toe Table', roomId: HQ_ROOM.game, capacity: 2, launchType: 'EXTERNAL_URL', providerId: GAME_PROVIDER.papergamesTicTacToe },
  { id: GAME_STATION.connectFour01, gameType: 'CONNECT_FOUR', name: 'Connect Four Table', roomId: HQ_ROOM.game, capacity: 2, launchType: 'EXTERNAL_URL', providerId: GAME_PROVIDER.papergamesConnectFour },
];

export const GAME_TYPE_LABEL: Readonly<Record<GameType, string>> = {
  PONG: 'Ping Pong',
  TIC_TAC_TOE: 'Tic-Tac-Toe',
  CONNECT_FOUR: 'Connect Four',
  CHESS: 'Chess',
};

export function findGameStation(stationId: unknown): GameStation | undefined {
  return typeof stationId === 'string' ? GAME_STATIONS.find((station) => station.id === stationId) : undefined;
}
