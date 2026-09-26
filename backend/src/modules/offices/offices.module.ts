import { Module } from '@nestjs/common';
import { ActivitiesModule } from '../activities/activities.module';
import { AvatarsModule } from '../avatars/avatars.module';
import { AzureDevOpsModule } from '../azure-devops/azure-devops.module';
import { EmployeesModule } from '../employees/employees.module';
import { PresenceModule } from '../presence/presence.module';
import { OfficeStateController } from './office-state.controller';
import { OfficeStateService } from './office-state.service';
import { OfficesController } from './offices.controller';
import { OfficesService } from './offices.service';

@Module({
  imports: [EmployeesModule, AvatarsModule, PresenceModule, ActivitiesModule, AzureDevOpsModule],
  controllers: [OfficesController, OfficeStateController],
  providers: [OfficesService, OfficeStateService],
  exports: [OfficesService],
})
export class OfficesModule {}
