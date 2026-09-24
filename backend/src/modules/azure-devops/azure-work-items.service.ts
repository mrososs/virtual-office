import { Injectable } from '@nestjs/common';
import { AzureAuthService } from './azure-auth.service';
import { AzureWorkItem } from './azure.types';

/** Read access to Azure DevOps work items via the REST API (not called yet). */
@Injectable()
export class AzureWorkItemsService {
  constructor(private readonly azureAuthService: AzureAuthService) {}

  async getAssignedWorkItems(assignedToUniqueName: string): Promise<AzureWorkItem[]> {
    // TODO: GET {orgUrl}/{project}/_apis/wit/wiql with a WIQL query filtering
    // by [System.AssignedTo], using this.azureAuthService.getAuthHeader().
    void this.azureAuthService;
    void assignedToUniqueName;
    return [];
  }

  async getWorkItem(id: number): Promise<AzureWorkItem | null> {
    // TODO: GET {orgUrl}/_apis/wit/workitems/{id}
    void id;
    return null;
  }
}
