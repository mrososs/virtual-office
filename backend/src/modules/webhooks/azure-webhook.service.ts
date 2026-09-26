import { Injectable, Logger, ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CryptoService } from '../../common/security/crypto.service';
import { AppConfig } from '../../config/configuration';
import { ActivityEngine } from '../activities/activity-engine.service';
import { AzureEventMapper } from './azure-event.mapper';
import { AzureServiceHookEvent } from '../azure-devops/azure.types';

/**
 * Handles inbound Azure DevOps Service Hooks: authenticates the call, maps it
 * to an `ActivitySignal` via `AzureEventMapper`, and forwards it to the
 * `ActivityEngine`. This is the push-based counterpart to `AzureSyncService`'s
 * scheduled pull, kept for a later phase.
 */
@Injectable()
export class AzureWebhookService {
  private readonly logger = new Logger(AzureWebhookService.name);
  private readonly secret: string;

  constructor(
    configService: ConfigService,
    private readonly crypto: CryptoService,
    private readonly azureEventMapper: AzureEventMapper,
    private readonly activityEngine: ActivityEngine,
  ) {
    this.secret = configService.get<AppConfig>('app')!.azureDevOps.webhookSecret;
  }

  /** Service Hook subscriptions are configured with Basic auth; the password must equal AZURE_DEVOPS_WEBHOOK_SECRET. */
  authorize(authorization: string | undefined): void {
    if (!this.secret) throw new ServiceUnavailableException('Azure DevOps Service Hooks are not enabled (Phase 1 uses the scheduled sync)');
    const encoded = authorization?.startsWith('Basic ') ? authorization.slice(6) : '';
    const decoded = Buffer.from(encoded, 'base64').toString('utf8');
    const password = decoded.slice(decoded.indexOf(':') + 1);
    if (!encoded || !this.crypto.safeEqual(password, this.secret)) throw new UnauthorizedException();
  }

  async handleEvent(event: AzureServiceHookEvent): Promise<void> {
    // TODO: resolve `employeeId` from the resource's assignee/author through the
    // Azure identity mapping (azure_devops_identities), instead of this placeholder.
    const employeeId = 'unknown';

    const signal = this.azureEventMapper.toActivitySignal(event, employeeId);
    if (!signal) {
      this.logger.debug(`Ignored unrecognized Azure DevOps event type: ${event.eventType}`);
      return;
    }

    await this.activityEngine.ingestSignal(signal);
  }
}
