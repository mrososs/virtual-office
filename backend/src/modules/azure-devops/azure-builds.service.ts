import { Injectable } from '@nestjs/common';
import { AzureAuthService } from './azure-auth.service';
import { AzureBuild } from './azure.types';

/** Read access to Azure DevOps build/pipeline runs via the REST API (not called yet). */
@Injectable()
export class AzureBuildsService {
  constructor(private readonly azureAuthService: AzureAuthService) {}

  async getRunningBuilds(): Promise<AzureBuild[]> {
    // TODO: GET {orgUrl}/{project}/_apis/build/builds?statusFilter=inProgress
    void this.azureAuthService;
    return [];
  }

  async getBuild(id: number): Promise<AzureBuild | null> {
    // TODO: GET {orgUrl}/{project}/_apis/build/builds/{id}
    void id;
    return null;
  }
}
