import { Injectable, Logger } from '@nestjs/common';
import { ActivityEngine } from '../activities/activity-engine.service';
import { AzureWorkItemsService } from './azure-work-items.service';
import { AzurePullRequestsService } from './azure-pull-requests.service';
import { AzureBuildsService } from './azure-builds.service';
import { AzureWorkItemAdapter } from './adapters/azure-work-item.adapter';

/**
 * Periodic/polling sync entry point: pulls work items, PRs, and builds from
 * Azure DevOps, runs them through the adapters to get `ActivitySignal`s, and
 * hands each to `ActivityEngine.ingestSignal`. (The webhook path in
 * `modules/webhooks` covers the push/real-time side of the same data.)
 */
@Injectable()
export class AzureSyncService {
  private readonly logger = new Logger(AzureSyncService.name);
  private readonly workItemAdapter = new AzureWorkItemAdapter();

  constructor(
    private readonly workItemsService: AzureWorkItemsService,
    private readonly pullRequestsService: AzurePullRequestsService,
    private readonly buildsService: AzureBuildsService,
    private readonly activityEngine: ActivityEngine,
  ) {}

  /** TODO: wire up as a scheduled job (e.g. @nestjs/schedule cron) once real API calls exist. */
  async syncEmployee(employeeId: string, azureUniqueName: string): Promise<void> {
    const workItems = await this.workItemsService.getAssignedWorkItems(azureUniqueName);

    for (const workItem of workItems) {
      const signal = this.workItemAdapter.toActivitySignal(workItem, employeeId);
      if (signal) {
        await this.activityEngine.ingestSignal(signal);
      }
    }

    // TODO: same pattern for pull requests (awaiting review -> CODE_REVIEW)
    // and builds (running builds requested by this employee -> BUILDING).
    void this.pullRequestsService;
    void this.buildsService;

    this.logger.debug(`Synced Azure DevOps activity for employee ${employeeId}`);
  }
}
