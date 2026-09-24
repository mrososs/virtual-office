import { Injectable } from '@nestjs/common';
import { AzureAuthService } from './azure-auth.service';
import { AzurePullRequest } from './azure.types';

/** Read access to Azure DevOps pull requests via the REST API (not called yet). */
@Injectable()
export class AzurePullRequestsService {
  constructor(private readonly azureAuthService: AzureAuthService) {}

  async getActivePullRequests(repositoryId: string): Promise<AzurePullRequest[]> {
    // TODO: GET {orgUrl}/{project}/_apis/git/repositories/{repositoryId}/pullrequests?searchCriteria.status=active
    void this.azureAuthService;
    void repositoryId;
    return [];
  }

  async getPullRequestsAwaitingReviewBy(reviewerUniqueName: string): Promise<AzurePullRequest[]> {
    // TODO: filter active PRs where `reviewers` includes reviewerUniqueName with vote === 0.
    void reviewerUniqueName;
    return [];
  }
}
