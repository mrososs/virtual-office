import { Injectable } from '@nestjs/common';
import type { Meeting } from '@virtual-office/shared';
import { GraphClientService } from '../graph-client.service';
import { TeamsMeetingMapper } from './teams-meeting.mapper';
import { GraphOnlineMeeting } from './meeting.types';

/** Reads/creates Microsoft Teams online meetings via Microsoft Graph. */
@Injectable()
export class MicrosoftMeetingsService {
  constructor(
    private readonly graphClient: GraphClientService,
    private readonly teamsMeetingMapper: TeamsMeetingMapper,
  ) {}

  async getOnlineMeeting(organizationId: string, meetingId: string): Promise<Meeting> {
    // TODO: GET /me/onlineMeetings/{meetingId}
    const graphMeeting = await this.graphClient.get<GraphOnlineMeeting>(`/me/onlineMeetings/${meetingId}`);
    return this.teamsMeetingMapper.toMeeting(organizationId, graphMeeting);
  }
}
