import { Body, Controller, HttpCode, HttpStatus, Headers, Post } from '@nestjs/common';
import { AzureWebhookService } from './azure-webhook.service';
import { AzureServiceHookEvent } from '../azure-devops/azure.types';

/**
 * Receives Azure DevOps Service Hooks HTTP callbacks — the *future* push path
 * (Phase 1 uses the scheduled sync in `azure-devops/`). Not behind the session
 * guard: Azure DevOps authenticates with Basic auth whose password is
 * AZURE_DEVOPS_WEBHOOK_SECRET. Without that secret the endpoint is disabled.
 */
@Controller('webhooks/azure-devops')
export class AzureWebhookController {
  constructor(private readonly azureWebhookService: AzureWebhookService) {}

  @Post()
  @HttpCode(HttpStatus.ACCEPTED)
  async receive(@Body() event: AzureServiceHookEvent, @Headers('authorization') authorization?: string): Promise<{ received: true }> {
    this.azureWebhookService.authorize(authorization);
    await this.azureWebhookService.handleEvent(event);
    return { received: true };
  }
}
