import { Injectable, Logger } from '@nestjs/common';
import { ActivityEngine } from '../activities/activity-engine.service';
import { AzureEventMapper } from './azure-event.mapper';
import { AzureServiceHookEvent } from '../azure-devops/azure.types';

/**
 * Handles inbound Azure DevOps Service Hooks: validates the payload, maps
 * it to an `ActivitySignal` via `AzureEventMapper`, and forwards it to the
 * `ActivityEngine`. This is the push-based counterpart to `AzureSyncService`'s
 * polling.
 */
@Injectable()
export class AzureWebhookService {
  private readonly logger = new Logger(AzureWebhookService.name);

  constructor(
    private readonly azureEventMapper: AzureEventMapper,
    private readonly activityEngine: ActivityEngine,
  ) {}

  async handleEvent(event: AzureServiceHookEvent, signature?: string): Promise<void> {
    // TODO: verify `signature` against AZURE_DEVOPS_WEBHOOK_SECRET (HMAC or
    // Basic-auth-in-URL, depending on how the service hook is configured)
    // before trusting the payload.
    void signature;

    // TODO: resolve `employeeId` from the resource's assignee/author unique
    // name via EmployeesService, instead of this placeholder.
    const employeeId = 'unknown';

    const signal = this.azureEventMapper.toActivitySignal(event, employeeId);
    if (!signal) {
      this.logger.debug(`Ignored unrecognized Azure DevOps event type: ${event.eventType}`);
      return;
    }

    await this.activityEngine.ingestSignal(signal);
  }
}
