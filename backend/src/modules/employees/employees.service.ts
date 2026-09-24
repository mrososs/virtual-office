import { Injectable } from '@nestjs/common';
import type { Employee, UUID } from '@virtual-office/shared';
import { SupabaseService } from '../../common/supabase/supabase.service';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';

@Injectable()
export class EmployeesService {
  constructor(private readonly supabaseService: SupabaseService) {}

  async findById(employeeId: UUID): Promise<Employee | null> {
    // TODO: query the `employees` table and hydrate presence/activity/room.
    void employeeId;
    return null;
  }

  async findByOrganization(organizationId: UUID): Promise<Employee[]> {
    // TODO: query all employees for an organization.
    void organizationId;
    return [];
  }

  async create(dto: CreateEmployeeDto): Promise<Employee> {
    // TODO: insert into `employees` with default presence/activity state.
    void dto;
    throw new Error('Not implemented');
  }

  async update(employeeId: UUID, dto: UpdateEmployeeDto): Promise<Employee> {
    // TODO: patch the `employees` row.
    void employeeId;
    void dto;
    throw new Error('Not implemented');
  }
}
