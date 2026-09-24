import { Module } from '@nestjs/common';
import { MicrosoftAuthService } from './microsoft-auth.service';
import { GraphClientService } from './graph-client.service';
import { MicrosoftCalendarService } from './calendar/microsoft-calendar.service';
import { CalendarEventMapper } from './calendar/calendar-event.mapper';
import { MicrosoftMeetingsService } from './meetings/microsoft-meetings.service';
import { TeamsMeetingMapper } from './meetings/teams-meeting.mapper';

@Module({
  providers: [
    MicrosoftAuthService,
    GraphClientService,
    MicrosoftCalendarService,
    CalendarEventMapper,
    MicrosoftMeetingsService,
    TeamsMeetingMapper,
  ],
  exports: [MicrosoftCalendarService, MicrosoftMeetingsService],
})
export class MicrosoftModule {}
