import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppConfig } from '../../config/configuration';

/**
 * Owns the Microsoft Entra ID (Azure AD) app-only OAuth flow used to call
 * Microsoft Graph (Teams presence/calendar). Distinct from `modules/auth`,
 * which authenticates a *person* into this platform.
 */
@Injectable()
export class MicrosoftAuthService {
  constructor(private readonly configService: ConfigService) {}

  /** Returns a valid Graph access token, refreshing/caching as needed. */
  async getAccessToken(): Promise<string> {
    const { microsoft } = this.configService.get<AppConfig>('app')!;
    // TODO: client-credentials grant against
    // https://login.microsoftonline.com/{tenantId}/oauth2/v2.0/token
    // using clientId/clientSecret, cache token until expiry.
    void microsoft;
    throw new Error('Not implemented');
  }
}
