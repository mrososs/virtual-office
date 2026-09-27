import { Module } from '@nestjs/common';

import { ExternalGameUrlValidator } from './external/external-game-url.validator';
import { LichessRoomClient } from './external/lichess-room.client';
import { GameSessionManager } from './game-session.manager';
import { GamesGateway } from './games.gateway';

/**
 * Game Room: station occupancy and game sessions over the office socket.
 * External providers run the actual games; the internal Pong engine is only
 * used by INTERNAL_GAME stations (none today). In-memory state only —
 * nothing is written to Supabase.
 */
@Module({
  providers: [ExternalGameUrlValidator, LichessRoomClient, GameSessionManager, GamesGateway],
})
export class GamesModule {}
