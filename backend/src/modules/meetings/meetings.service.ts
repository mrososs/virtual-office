import { Injectable } from '@nestjs/common';
import type { Meeting, UUID } from '@virtual-office/shared';
import { SupabaseService } from '../../common/supabase/supabase.service';

@Injectable()
export class MeetingsService {
  constructor(private readonly supabaseService: SupabaseService) {}

  async findById(meetingId: UUID): Promise<Meeting | null> {
    // TODO: query the `meetings` table.
    void meetingId;
    return null;
  }

  async findByOrganization(organizationId: UUID): Promise<Meeting[]> {
    // TODO: query all meetings for an organization (optionally filtered by status/date range).
    void organizationId;
    return [];
  }

  async upsertFromExternal(meeting: Meeting): Promise<Meeting> {
    // TODO: insert/update a meeting row keyed by (externalProvider, externalMeetingId),
    // called from `microsoft/meetings` sync.
    return meeting;
  }
}
