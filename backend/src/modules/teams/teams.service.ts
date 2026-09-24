import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../../common/supabase/supabase.service';
import { Team } from './entities/team.entity';

@Injectable()
export class TeamsService {
  constructor(private readonly supabaseService: SupabaseService) {}

  async findById(teamId: string): Promise<Team | null> {
    // TODO: query the `teams` table.
    void teamId;
    return null;
  }

  async findByOrganization(organizationId: string): Promise<Team[]> {
    // TODO: query all teams for an organization.
    void organizationId;
    return [];
  }
}
