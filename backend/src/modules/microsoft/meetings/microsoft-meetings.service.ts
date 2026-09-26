import { Injectable } from '@nestjs/common';
import type { Meeting, UUID } from '@virtual-office/shared';
import { GraphClientService } from '../graph-client.service';
import { TeamsMeetingMapper } from './teams-meeting.mapper';
import { GraphOnlineMeeting } from './meeting.types';

/** Reads Microsoft Teams online meetings via Microsoft Graph (next phase; not wired yet). */
@Injectable()
export class MicrosoftMeetingsService {
  constructor(
    private readonly graphClient: GraphClientService,
    private readonly teamsMeetingMapper: TeamsMeetingMapper,
  ) {}

  async getOnlineMeeting(organizationId: string, employeeId: UUID, meetingId: string): Promise<Meeting> {
    // Needs the delegated OnlineMeetings.Read scope — request it only if the calendar joinUrl is not enough.
    const graphMeeting = await this.graphClient.get<GraphOnlineMeeting>(employeeId, `/me/onlineMeetings/${meetingId}`, [
      'https://graph.microsoft.com/OnlineMeetings.Read',
    ]);
    return this.teamsMeetingMapper.toMeeting(organizationId, graphMeeting);
  }
}
