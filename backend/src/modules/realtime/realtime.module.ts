import { Module } from '@nestjs/common';
import { OfficeGateway } from './office.gateway';
import { OfficePresenceRegistry } from './office-presence.registry';
import { AuthModule } from '../auth/auth.module';
import { PresenceModule } from '../presence/presence.module';

@Module({
  imports: [PresenceModule, AuthModule],
  providers: [OfficeGateway, OfficePresenceRegistry],
  exports: [OfficeGateway],
})
export class RealtimeModule {}
