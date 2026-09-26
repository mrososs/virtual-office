import { Module } from '@nestjs/common';
import { PresenceRepository } from './presence.repository';
import { PresenceService } from './presence.service';

/**
 * See the note in `presence.service.ts`: presence (connection state) and
 * activity (work-tool derived state) are separate concepts and must stay in
 * separate modules with no cross-dependency in either direction.
 */
@Module({
  providers: [PresenceRepository, PresenceService],
  exports: [PresenceService],
})
export class PresenceModule {}
