import { Injectable, Logger } from '@nestjs/common';
import { isHqDeskId, pickHqDeskForRole, type UUID } from '@virtual-office/shared';
import { EmployeeRepository } from './employee.repository';
import type { EmployeeRecord } from './employee.record';

/** Public shape of a teammate (no Microsoft identifiers). */
export interface TeamMemberDto {
  id: UUID;
  displayName: string;
  email: string;
  role: EmployeeRecord['role'];
  jobTitle: string | null;
  team: string | null;
  discipline: string | null;
  assignedDeskId: string | null;
}

@Injectable()
export class EmployeesService {
  private readonly logger = new Logger(EmployeesService.name);

  constructor(private readonly employees: EmployeeRepository) {}

  findById(id: UUID): Promise<EmployeeRecord | null> {
    return this.employees.findById(id);
  }

  listActive(): Promise<EmployeeRecord[]> {
    return this.employees.listActive();
  }

  /**
   * Makes sure the employee owns a desk: keeps a valid seeded one, otherwise
   * takes the first free desk in their role's area and persists it. A full
   * area simply leaves them deskless (the office places them in the area).
   */
  async ensureDesk(employee: EmployeeRecord): Promise<EmployeeRecord> {
    if (employee.assignedDeskId && isHqDeskId(employee.assignedDeskId)) return employee;
    if (employee.assignedDeskId) {
      this.logger.warn(`Employee ${employee.id} has unknown desk "${employee.assignedDeskId}" — leaving it for an admin to fix.`);
      return employee;
    }
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const deskId = pickHqDeskForRole(employee.role, await this.employees.listAssignedDeskIds());
      if (!deskId) return employee;
      const updated = await this.employees.assignDesk(employee.id, deskId);
      if (updated) return updated;
      // Someone else took that desk (or this employee got one) in the meantime: re-read and retry.
      const fresh = await this.employees.findById(employee.id);
      if (!fresh || fresh.assignedDeskId) return fresh ?? employee;
    }
    return employee;
  }

  toTeamMember(employee: EmployeeRecord): TeamMemberDto {
    return {
      id: employee.id,
      displayName: employee.displayName,
      email: employee.email,
      role: employee.role,
      jobTitle: employee.jobTitle,
      team: employee.team,
      discipline: employee.discipline,
      assignedDeskId: employee.assignedDeskId,
    };
  }
}
