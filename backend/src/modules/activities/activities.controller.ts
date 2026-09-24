import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import type { EmployeeActivity } from '@virtual-office/shared';
import { ActivityEngine } from './activity-engine.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

/** Debug/inspection endpoint — not part of the primary write path. */
@UseGuards(JwtAuthGuard)
@Controller('debug/activities')
export class ActivitiesController {
  constructor(private readonly activityEngine: ActivityEngine) {}

  @Get(':employeeId')
  resolve(@Param('employeeId') employeeId: string): Promise<EmployeeActivity> {
    return this.activityEngine.resolveForEmployee(employeeId);
  }
}
