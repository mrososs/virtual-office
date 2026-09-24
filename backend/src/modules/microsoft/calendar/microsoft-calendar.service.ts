import { Injectable } from '@nestjs/common';
import type { Meeting } from '@virtual-office/shared';
import { GraphClientService } from '../graph-client.service';
import { CalendarEventMapper } from './calendar-event.mapper';
import { GraphCalendarEvent } from './calendar.types';

/** Reads Microsoft 365 Calendar events for an employee via Microsoft Graph. */
@Injectable()
export class MicrosoftCalendarService {
  constructor(
    private readonly graphClient: GraphClientService,
    private readonly calendarEventMapper: CalendarEventMapper,
  ) {}

  async listUpcomingEvents(organizationId: string, userPrincipalName: string): Promise<Meeting[]> {
    // TODO: GET /users/{userPrincipalName}/calendarView?startDateTime=...&endDateTime=...
    const events = await this.graphClient.get<GraphCalendarEvent[]>(
      `/users/${userPrincipalName}/calendarView`,
    );
    return events.map((event) => this.calendarEventMapper.toMeeting(organizationId, event));
  }
}
