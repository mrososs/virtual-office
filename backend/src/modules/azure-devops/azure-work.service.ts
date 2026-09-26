import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { WorkSnapshot } from '@virtual-office/shared';
import { AppConfig } from '../../config/configuration';
import { toBuild, toPullRequest, toSprint, toWorkItem } from './azure-work.mapper';
import { AzureBuildRepository } from './repositories/azure-build.repository';
import { AzurePullRequestRepository } from './repositories/azure-pull-request.repository';
import { AzureSyncStateRepository } from './repositories/azure-sync-state.repository';
import { AzureWorkItemRepository } from './repositories/azure-work-item.repository';

/** Stored Azure DevOps data as shared domain models — what the office and Vue see (never raw API shapes). */
@Injectable()
export class AzureWorkService {
  private readonly organizationId: string;

  constructor(
    configService: ConfigService,
    private readonly workItems: AzureWorkItemRepository,
    private readonly pullRequests: AzurePullRequestRepository,
    private readonly builds: AzureBuildRepository,
    private readonly syncState: AzureSyncStateRepository,
  ) {
    this.organizationId = configService.get<AppConfig>('app')!.organization.id;
  }

  async getSnapshot(): Promise<WorkSnapshot> {
    const [workItems, pullRequests, builds, state] = await Promise.all([
      this.workItems.listAll(),
      this.pullRequests.listAll(),
      this.builds.listAll(),
      this.syncState.get(),
    ]);
    const projectName = state.projectName ?? '';
    return {
      workItems: workItems.map((row) => toWorkItem(row, this.organizationId, projectName)),
      pullRequests: pullRequests.map((row) => toPullRequest(row, this.organizationId)),
      builds: builds.map((row) => toBuild(row, this.organizationId)),
      sprint: toSprint(state),
      syncedAt: state.lastSuccessAt,
    };
  }
}
