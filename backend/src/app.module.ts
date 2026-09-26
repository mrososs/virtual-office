import { Module } from '@nestjs/common';
import { ConditionalModule, ConfigModule } from '@nestjs/config';
import { APP_INTERCEPTOR } from '@nestjs/core';

import configuration, { isDemoModeEnabled } from './config/configuration';
import { validate } from './config/env.validation';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { SecurityModule } from './common/security/security.module';
import { SupabaseModule } from './common/supabase/supabase.module';

import { SessionModule } from './modules/session/session.module';
import { AuthModule } from './modules/auth/auth.module';
import { OrganizationsModule } from './modules/organizations/organizations.module';
import { TeamsModule } from './modules/teams/teams.module';
import { EmployeesModule } from './modules/employees/employees.module';
import { AvatarsModule } from './modules/avatars/avatars.module';
import { OfficesModule } from './modules/offices/offices.module';
import { RoomsModule } from './modules/rooms/rooms.module';
import { MeetingsModule } from './modules/meetings/meetings.module';
import { PresenceModule } from './modules/presence/presence.module';
import { ActivitiesModule } from './modules/activities/activities.module';
import { RealtimeModule } from './modules/realtime/realtime.module';
import { AzureDevOpsModule } from './modules/azure-devops/azure-devops.module';
import { MicrosoftModule } from './modules/microsoft/microsoft.module';
import { WebhooksModule } from './modules/webhooks/webhooks.module';
import { DemoModule } from './modules/demo/demo.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validate,
    }),
    SupabaseModule,
    SecurityModule,
    SessionModule,

    AuthModule,
    OrganizationsModule,
    TeamsModule,
    EmployeesModule,
    AvatarsModule,
    OfficesModule,
    RoomsModule,
    MeetingsModule,
    PresenceModule,
    ActivitiesModule,
    RealtimeModule,
    AzureDevOpsModule,
    MicrosoftModule,
    WebhooksModule,

    ConditionalModule.registerWhen(DemoModule, isDemoModeEnabled),
  ],
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },
  ],
})
export class AppModule {}
