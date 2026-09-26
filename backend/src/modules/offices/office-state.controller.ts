import { Controller, Get, UseGuards } from '@nestjs/common';
import type { OfficeStateResponse } from '@virtual-office/shared';
import { SessionAuthGuard } from '../session/session-auth.guard';
import { OfficeStateService } from './office-state.service';

@UseGuards(SessionAuthGuard)
@Controller('office')
export class OfficeStateController {
  constructor(private readonly officeState: OfficeStateService) {}

  @Get('state')
  getState(): Promise<OfficeStateResponse> {
    return this.officeState.getState();
  }
}
