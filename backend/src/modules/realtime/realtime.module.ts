import { Module } from '@nestjs/common';
import { ActivitiesModule } from '../activities/activities.module';
import { AzureDevOpsModule } from '../azure-devops/azure-devops.module';
import { DemoTokenModule } from '../demo/demo-token.module';
import { PresenceModule } from '../presence/presence.module';
import { MeetingRoomSessions } from './meeting-room-sessions';
import { OfficeGateway } from './office.gateway';
import { OfficePresenceRegistry } from './office-presence.registry';

@Module({
  imports: [PresenceModule, DemoTokenModule, ActivitiesModule, AzureDevOpsModule],
  providers: [OfficeGateway, OfficePresenceRegistry, MeetingRoomSessions],
  exports: [OfficeGateway],
})
export class RealtimeModule {}
