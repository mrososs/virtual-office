import { Injectable } from '@nestjs/common';
import type { Meeting, UUID } from '@virtual-office/shared';
import { GraphClientService } from '../graph-client.service';
import { CalendarEventMapper } from './calendar-event.mapper';
import { GraphCalendarEvent } from './calendar.types';

/** Reads an employee's Microsoft 365 Calendar events via Microsoft Graph (next phase; not wired yet). */
@Injectable()
export class MicrosoftCalendarService {
  constructor(
    private readonly graphClient: GraphClientService,
    private readonly calendarEventMapper: CalendarEventMapper,
  ) {}

  async listUpcomingEvents(organizationId: string, employeeId: UUID): Promise<Meeting[]> {
    // TODO: add startDateTime/endDateTime (calendarView requires both) and page through @odata.nextLink.
    const response = await this.graphClient.get<{ value: GraphCalendarEvent[] }>(employeeId, '/me/calendarView');
    return response.value.map((event) => this.calendarEventMapper.toMeeting(organizationId, event));
  }
}
