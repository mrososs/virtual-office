import { Module } from '@nestjs/common';
import { ActivitiesModule } from '../activities/activities.module';
import { EmployeesModule } from '../employees/employees.module';
import { EntraModule } from '../entra/entra.module';
import { AzureDevOpsApiClient } from './azure-devops-api.client';
import { AzureDevOpsConnectionService } from './azure-devops-connection.service';
import { AzureSyncService } from './azure-sync.service';
import { AzureWorkService } from './azure-work.service';
import { AzureCredentialService } from './credentials/azure-credential.service';
import { IntegrationsController, WorkController } from './integrations.controller';
import { AzureBuildRepository } from './repositories/azure-build.repository';
import { AzureConnectionRepository } from './repositories/azure-connection.repository';
import { AzureIdentityRepository } from './repositories/azure-identity.repository';
import { AzurePullRequestRepository } from './repositories/azure-pull-request.repository';
import { AzureSyncStateRepository } from './repositories/azure-sync-state.repository';
import { AzureWorkItemRepository } from './repositories/azure-work-item.repository';
import { WorkSyncEvents } from './work-sync-events';

/**
 * Azure DevOps read integration (employee PATs today, delegated Entra later). Raw API
 * shapes stay inside this module; it exports domain-level services only.
 */
@Module({
  imports: [EntraModule, EmployeesModule, ActivitiesModule],
  controllers: [IntegrationsController, WorkController],
  providers: [
    AzureDevOpsApiClient,
    AzureCredentialService,
    AzureWorkItemRepository,
    AzurePullRequestRepository,
    AzureBuildRepository,
    AzureIdentityRepository,
    AzureConnectionRepository,
    AzureSyncStateRepository,
    AzureWorkService,
    AzureSyncService,
    AzureDevOpsConnectionService,
    WorkSyncEvents,
  ],
  exports: [AzureDevOpsConnectionService, AzureWorkService, WorkSyncEvents, AzureIdentityRepository],
})
export class AzureDevOpsModule {}
