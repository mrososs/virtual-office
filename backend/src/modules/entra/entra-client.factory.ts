import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ConfidentialClientApplication, LogLevel, type Configuration } from '@azure/msal-node';
import { AppConfig } from '../../config/configuration';

const DEFAULT_AUTHORITY_HOST = 'https://login.microsoftonline.com';

/**
 * Builds MSAL Node confidential clients for the single-tenant iSaned app
 * registration. The authority is always the iSaned tenant
 * (`https://login.microsoftonline.com/<ENTRA_TENANT_ID>`) — never `common`,
 * `organizations` or `consumers` (env validation rejects non-GUID tenants).
 *
 * A fresh client per operation keeps token caches isolated per employee: the
 * caller loads that employee's (decrypted) cache into it and persists it back.
 */
@Injectable()
export class EntraClientFactory {
  private readonly logger = new Logger('MSAL');
  private readonly entra: AppConfig['entra'];

  constructor(configService: ConfigService) {
    this.entra = configService.get<AppConfig>('app')!.entra;
  }

  isConfigured(): boolean {
    return Boolean(this.entra.tenantId && this.entra.clientId && this.entra.clientSecret && this.entra.redirectUri);
  }

  get tenantId(): string {
    return this.entra.tenantId;
  }

  get clientId(): string {
    return this.entra.clientId;
  }

  get redirectUri(): string {
    return this.entra.redirectUri;
  }

  /** The `iss` a v2.0 ID token from the iSaned tenant must carry. */
  get expectedIssuer(): string {
    return `${this.entra.authorityHost}/${this.entra.tenantId}/v2.0`;
  }

  create(): ConfidentialClientApplication {
    const customHost = this.entra.authorityHost !== DEFAULT_AUTHORITY_HOST;
    const configuration: Configuration = {
      auth: {
        clientId: this.entra.clientId,
        clientSecret: this.entra.clientSecret,
        authority: `${this.entra.authorityHost}/${this.entra.tenantId}`,
        // National clouds are not in MSAL's built-in instance list.
        ...(customHost ? { knownAuthorities: [new URL(this.entra.authorityHost).host] } : {}),
      },
      system: {
        loggerOptions: {
          piiLoggingEnabled: false,
          logLevel: LogLevel.Warning,
          loggerCallback: (level, message) => {
            if (level === LogLevel.Error) this.logger.error(message);
            else if (level === LogLevel.Warning) this.logger.warn(message);
          },
        },
      },
    };
    return new ConfidentialClientApplication(configuration);
  }
}
