import { Body, Controller, HttpCode, HttpStatus, Headers, Post } from '@nestjs/common';
import { AzureWebhookService } from './azure-webhook.service';
import { AzureServiceHookEvent } from '../azure-devops/azure.types';

/**
 * Receives Azure DevOps Service Hooks HTTP callbacks. Intentionally not
 * behind `JwtAuthGuard` — Azure DevOps authenticates via a shared secret in
 * the webhook subscription URL / signature header instead (verified inside
 * `AzureWebhookService.handleEvent`), not a platform user JWT.
 */
@Controller('webhooks/azure-devops')
export class AzureWebhookController {
  constructor(private readonly azureWebhookService: AzureWebhookService) {}

  @Post()
  @HttpCode(HttpStatus.ACCEPTED)
  async receive(
    @Body() event: AzureServiceHookEvent,
    @Headers('x-hub-signature') signature?: string,
  ): Promise<{ received: true }> {
    await this.azureWebhookService.handleEvent(event, signature);
    return { received: true };
  }
}
