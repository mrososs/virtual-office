import { Module } from '@nestjs/common';
import { EntraAuthCodeFlowService } from './entra-auth-code-flow.service';
import { EntraClientFactory } from './entra-client.factory';
import { MicrosoftTokenCacheRepository } from './microsoft-token-cache.repository';
import { MicrosoftTokenService } from './microsoft-token.service';

/**
 * Microsoft Entra ID (single-tenant) plumbing shared by sign-in (`auth`) and
 * delegated API access (`azure-devops`, later Microsoft Graph). Knows nothing
 * about employees or sessions.
 */
@Module({
  providers: [EntraClientFactory, EntraAuthCodeFlowService, MicrosoftTokenCacheRepository, MicrosoftTokenService],
  exports: [EntraAuthCodeFlowService, MicrosoftTokenService],
})
export class EntraModule {}
