import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import type { Meeting } from '@virtual-office/shared';
import { MeetingsService } from './meetings.service';
import { SessionAuthGuard } from '../session/session-auth.guard';

@UseGuards(SessionAuthGuard)
@Controller('meetings')
export class MeetingsController {
  constructor(private readonly meetingsService: MeetingsService) {}

  @Get(':id')
  findOne(@Param('id') id: string): Promise<Meeting | null> {
    return this.meetingsService.findById(id);
  }
}
