import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { TeamsService } from './teams.service';
import { SessionAuthGuard } from '../session/session-auth.guard';
import { Team } from './entities/team.entity';

@UseGuards(SessionAuthGuard)
@Controller('teams')
export class TeamsController {
  constructor(private readonly teamsService: TeamsService) {}

  @Get(':id')
  findOne(@Param('id') id: string): Promise<Team | null> {
    return this.teamsService.findById(id);
  }
}
