import { Module } from '@nestjs/common';
import { AzureDevOpsService } from './azure-devops.service';
import { AzureAuthService } from './azure-auth.service';
import { AzureWorkItemsService } from './azure-work-items.service';
import { AzurePullRequestsService } from './azure-pull-requests.service';
import { AzureBuildsService } from './azure-builds.service';
import { AzureSyncService } from './azure-sync.service';
import { ActivitiesModule } from '../activities/activities.module';

@Module({
  imports: [ActivitiesModule],
  providers: [
    AzureDevOpsService,
    AzureAuthService,
    AzureWorkItemsService,
    AzurePullRequestsService,
    AzureBuildsService,
    AzureSyncService,
  ],
  exports: [AzureDevOpsService, AzureSyncService],
})
export class AzureDevOpsModule {}
