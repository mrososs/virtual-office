import { Injectable } from '@nestjs/common';
import { AzureSyncService } from './azure-sync.service';

/**
 * Facade for the azure-devops module — other modules (e.g. a future
 * onboarding flow that links an employee's Azure DevOps identity) depend on
 * this rather than reaching into individual azure-* services directly.
 */
@Injectable()
export class AzureDevOpsService {
  constructor(private readonly azureSyncService: AzureSyncService) {}

  async syncEmployee(employeeId: string, azureUniqueName: string): Promise<void> {
    return this.azureSyncService.syncEmployee(employeeId, azureUniqueName);
  }
}
