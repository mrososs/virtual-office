import { Module } from '@nestjs/common';
import { EntraModule } from '../entra/entra.module';
import { GraphClientService } from './graph-client.service';
import { MicrosoftCalendarService } from './calendar/microsoft-calendar.service';
import { CalendarEventMapper } from './calendar/calendar-event.mapper';
import { MicrosoftMeetingsService } from './meetings/microsoft-meetings.service';
import { TeamsMeetingMapper } from './meetings/teams-meeting.mapper';

/** Microsoft Graph (calendar / Teams meetings) — next phase; reuses the delegated Entra token architecture. */
@Module({
  imports: [EntraModule],
  providers: [
    GraphClientService,
    MicrosoftCalendarService,
    CalendarEventMapper,
    MicrosoftMeetingsService,
    TeamsMeetingMapper,
  ],
  exports: [MicrosoftCalendarService, MicrosoftMeetingsService],
})
export class MicrosoftModule {}
