import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppConfig } from '../../config/configuration';

/**
 * Owns Azure DevOps authentication (Personal Access Token today; could grow
 * into an OAuth/service-connection flow later). Every other azure-devops/*
 * service asks this one for a ready-to-use auth header rather than reading
 * `AZURE_DEVOPS_PAT` from config directly.
 */
@Injectable()
export class AzureAuthService {
  constructor(private readonly configService: ConfigService) {}

  /** Returns the `Authorization` header value for Azure DevOps REST calls. */
  getAuthHeader(): string {
    const { azureDevOps } = this.configService.get<AppConfig>('app')!;
    // TODO: real PAT-based Basic auth encoding: `Basic ${base64(':' + pat)}`.
    void azureDevOps.personalAccessToken;
    throw new Error('Not implemented');
  }

  getOrganizationUrl(): string {
    const { azureDevOps } = this.configService.get<AppConfig>('app')!;
    return azureDevOps.orgUrl;
  }
}
