import { Controller, Get, NotFoundException, Param, ParseUUIDPipe, UseGuards } from '@nestjs/common';
import { SessionAuthGuard } from '../session/session-auth.guard';
import { EmployeesService, type TeamMemberDto } from './employees.service';

/**
 * Read-only team directory. Employees are provisioned (and roles assigned)
 * through the seed script / database, never from the browser — there is no
 * admin portal in this phase.
 */
@UseGuards(SessionAuthGuard)
@Controller('employees')
export class EmployeesController {
  constructor(private readonly employeesService: EmployeesService) {}

  @Get()
  async list(): Promise<TeamMemberDto[]> {
    const employees = await this.employeesService.listActive();
    return employees.map((employee) => this.employeesService.toTeamMember(employee));
  }

  @Get(':id')
  async findOne(@Param('id', ParseUUIDPipe) id: string): Promise<TeamMemberDto> {
    const employee = await this.employeesService.findById(id);
    if (!employee?.isActive) throw new NotFoundException();
    return this.employeesService.toTeamMember(employee);
  }
}
