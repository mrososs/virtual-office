import { Module } from '@nestjs/common';
import { AzureWebhookController } from './azure-webhook.controller';
import { AzureWebhookService } from './azure-webhook.service';
import { AzureEventMapper } from './azure-event.mapper';
import { ActivitiesModule } from '../activities/activities.module';

@Module({
  imports: [ActivitiesModule],
  controllers: [AzureWebhookController],
  providers: [AzureWebhookService, AzureEventMapper],
})
export class WebhooksModule {}
