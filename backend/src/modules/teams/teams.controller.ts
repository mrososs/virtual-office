import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { TeamsService } from './teams.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { Team } from './entities/team.entity';

@UseGuards(JwtAuthGuard)
@Controller('teams')
export class TeamsController {
  constructor(private readonly teamsService: TeamsService) {}

  @Get(':id')
  findOne(@Param('id') id: string): Promise<Team | null> {
    return this.teamsService.findById(id);
  }
}
