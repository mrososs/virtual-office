import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import type { Office, OfficeFloor } from '@virtual-office/shared';
import { OfficesService } from './offices.service';
import { SessionAuthGuard } from '../session/session-auth.guard';

@UseGuards(SessionAuthGuard)
@Controller('offices')
export class OfficesController {
  constructor(private readonly officesService: OfficesService) {}

  @Get(':id')
  findOne(@Param('id') id: string): Promise<Office | null> {
    return this.officesService.findById(id);
  }

  @Get(':id/floors')
  findFloors(@Param('id') id: string): Promise<OfficeFloor[]> {
    return this.officesService.findFloors(id);
  }
}
