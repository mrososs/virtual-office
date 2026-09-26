import { Module } from '@nestjs/common';
import { EmployeeRepository } from './employee.repository';
import { EmployeesController } from './employees.controller';
import { EmployeesService } from './employees.service';

@Module({
  controllers: [EmployeesController],
  providers: [EmployeeRepository, EmployeesService],
  exports: [EmployeeRepository, EmployeesService],
})
export class EmployeesModule {}
