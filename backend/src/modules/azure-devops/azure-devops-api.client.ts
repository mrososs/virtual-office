import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppConfig } from '../../config/configuration';
import type { AzureDevOpsCredential } from './credentials/azure-devops-credential';
import type {
  AzureBuild,
  AzureConnectionData,
  AzureIdentityRef,
  AzureIteration,
  AzureListResponse,
  AzureProject,
  AzurePullRequest,
  AzureTeam,
  AzureTeamMember,
  AzureWiqlResult,
  AzureWorkItem,
} from './azure.types';

const API_VERSION = '7.1';
const REQUEST_TIMEOUT_MS = 15_000;
const MAX_WORK_ITEMS = 200;
const WORK_ITEM_TYPES = ['Task', 'Bug', 'User Story', 'Product Backlog Item'];
const WORK_ITEM_FIELDS = [
  'System.Id',
  'System.Title',
  'System.WorkItemType',
  'System.State',
  'System.AssignedTo',
  'System.IterationPath',
  'System.Tags',
  'System.ChangedDate',
];

export type AzureDevOpsErrorKind = 'UNAUTHORIZED' | 'FORBIDDEN' | 'NOT_FOUND' | 'UNAVAILABLE' | 'UNKNOWN';

export class AzureDevOpsApiError extends Error {
  constructor(
    readonly kind: AzureDevOpsErrorKind,
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'AzureDevOpsApiError';
  }
}

/**
 * Read-only Azure DevOps REST client for the one configured organization and
 * project. Every call takes an `AzureDevOpsCredential` (an employee's PAT as
 * Basic auth today, a delegated Entra token later) — the client never knows
 * or stores where it came from, and never logs headers. No legacy Azure
 * DevOps OAuth, and no source code is ever requested — metadata only.
 */
@Injectable()
export class AzureDevOpsApiClient {
  private readonly logger = new Logger(AzureDevOpsApiClient.name);
  private readonly config: AppConfig['azureDevOps'];

  constructor(configService: ConfigService) {
    this.config = configService.get<AppConfig>('app')!.azureDevOps;
  }

  /** Organization + project: needed for the team sync. */
  isConfigured(): boolean {
    return Boolean(this.config.organization && this.config.project);
  }

  /** Organization only: enough to verify whose token it is (PAT sign-in). */
  isOrganizationConfigured(): boolean {
    return Boolean(this.config.organization);
  }

  get organization(): string {
    return this.config.organization;
  }

  get project(): string {
    return this.config.project;
  }

  get teamName(): string {
    return this.config.team;
  }

  /** Verifies the token can reach the organization, and tells us whose it is. */
  async getConnectionData(credential: AzureDevOpsCredential): Promise<AzureIdentityRef> {
    const data = await this.request<AzureConnectionData>(credential, 'GET', `${this.orgUrl}/_apis/connectionData`, undefined, false);
    const user = data.authenticatedUser;
    return {
      id: user.id,
      descriptor: user.descriptor,
      displayName: user.providerDisplayName,
      uniqueName: user.properties?.Account?.$value ?? user.providerDisplayName,
    };
  }

  getProject(credential: AzureDevOpsCredential): Promise<AzureProject> {
    return this.request<AzureProject>(credential, 'GET', `${this.orgUrl}/_apis/projects/${enc(this.config.project)}`);
  }

  getTeam(credential: AzureDevOpsCredential, projectId: string, team: string): Promise<AzureTeam> {
    return this.request<AzureTeam>(credential, 'GET', `${this.orgUrl}/_apis/projects/${enc(projectId)}/teams/${enc(team)}`);
  }

  async getTeamMembers(credential: AzureDevOpsCredential, projectId: string, teamId: string): Promise<AzureIdentityRef[]> {
    const members = await this.request<AzureListResponse<AzureTeamMember>>(
      credential,
      'GET',
      `${this.orgUrl}/_apis/projects/${enc(projectId)}/teams/${enc(teamId)}/members`,
      undefined,
      true,
      { $top: '500' },
    );
    return members.value.map((member) => member.identity);
  }

  async getCurrentIteration(credential: AzureDevOpsCredential, projectId: string, teamId: string): Promise<AzureIteration | null> {
    const iterations = await this.request<AzureListResponse<AzureIteration>>(
      credential,
      'GET',
      `${this.orgUrl}/${enc(projectId)}/${enc(teamId)}/_apis/work/teamsettings/iterations`,
      undefined,
      true,
      { $timeframe: 'current' },
    );
    return iterations.value[0] ?? null;
  }

  /** Current-iteration Tasks/Bugs/Stories — or, without an iteration, open items changed in the last two weeks. */
  async queryWorkItemIds(credential: AzureDevOpsCredential, projectId: string, teamId: string, iterationPath: string | null): Promise<number[]> {
    const types = WORK_ITEM_TYPES.map((type) => `'${type}'`).join(', ');
    const scope = iterationPath
      ? `[System.IterationPath] UNDER '${iterationPath.replace(/'/g, "''")}' AND [System.State] <> 'Removed'`
      : `[System.ChangedDate] >= @Today - 14 AND [System.State] NOT IN ('Closed', 'Done', 'Removed')`;
    const query = `SELECT [System.Id] FROM WorkItems WHERE [System.TeamProject] = @project AND [System.WorkItemType] IN (${types}) AND ${scope} ORDER BY [System.ChangedDate] DESC`;
    const result = await this.request<AzureWiqlResult>(
      credential,
      'POST',
      `${this.orgUrl}/${enc(projectId)}/${enc(teamId)}/_apis/wit/wiql`,
      { query },
      true,
      { $top: String(MAX_WORK_ITEMS) },
    );
    return result.workItems.map((item) => item.id).slice(0, MAX_WORK_ITEMS);
  }

  async getWorkItems(credential: AzureDevOpsCredential, projectId: string, ids: number[]): Promise<AzureWorkItem[]> {
    if (ids.length === 0) return [];
    const result = await this.request<AzureListResponse<AzureWorkItem>>(
      credential,
      'POST',
      `${this.orgUrl}/${enc(projectId)}/_apis/wit/workitemsbatch`,
      { ids, fields: WORK_ITEM_FIELDS, errorPolicy: 'omit' },
    );
    return result.value.filter((item) => item && item.fields);
  }

  async getActivePullRequests(credential: AzureDevOpsCredential, projectId: string): Promise<AzurePullRequest[]> {
    const result = await this.request<AzureListResponse<AzurePullRequest>>(
      credential,
      'GET',
      `${this.orgUrl}/${enc(projectId)}/_apis/git/pullrequests`,
      undefined,
      true,
      { 'searchCriteria.status': 'active', $top: '100' },
    );
    return result.value;
  }

  async getRecentBuilds(credential: AzureDevOpsCredential, projectId: string, since: Date): Promise<AzureBuild[]> {
    const result = await this.request<AzureListResponse<AzureBuild>>(
      credential,
      'GET',
      `${this.orgUrl}/${enc(projectId)}/_apis/build/builds`,
      undefined,
      true,
      { minTime: since.toISOString(), queryOrder: 'queueTimeDescending', $top: '50' },
    );
    return result.value;
  }

  workItemUrl(id: number): string {
    return `${this.orgUrl}/${enc(this.config.project)}/_workitems/edit/${id}`;
  }

  pullRequestUrl(repositoryName: string, id: number): string {
    return `${this.orgUrl}/${enc(this.config.project)}/_git/${enc(repositoryName)}/pullrequest/${id}`;
  }

  buildUrl(id: number): string {
    return `${this.orgUrl}/${enc(this.config.project)}/_build/results?buildId=${id}`;
  }

  private get orgUrl(): string {
    return `https://dev.azure.com/${enc(this.config.organization)}`;
  }

  private async request<T>(
    credential: AzureDevOpsCredential,
    method: 'GET' | 'POST',
    url: string,
    body?: unknown,
    withVersion = true,
    params: Record<string, string> = {},
  ): Promise<T> {
    const target = new URL(url);
    if (withVersion) target.searchParams.set('api-version', API_VERSION);
    for (const [key, value] of Object.entries(params)) target.searchParams.set(key, value);

    let response: Response;
    try {
      response = await fetch(target, {
        method,
        headers: {
          Authorization: credential.authorization,
          Accept: 'application/json',
          ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        },
        body: body !== undefined ? JSON.stringify(body) : undefined,
        redirect: 'manual',
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
    } catch (error) {
      throw new AzureDevOpsApiError('UNAVAILABLE', 0, `Azure DevOps unreachable: ${error instanceof Error ? error.message : String(error)}`);
    }

    // An unauthenticated call is answered with a 203 sign-in page (or a redirect), not a 401.
    const isJson = (response.headers.get('content-type') ?? '').includes('application/json');
    if (response.status === 203 || (response.status >= 300 && response.status < 400) || (response.ok && !isJson)) {
      throw new AzureDevOpsApiError('UNAUTHORIZED', response.status, 'Azure DevOps did not accept the token');
    }
    if (!response.ok) {
      const detail = await response.text().then((text) => extractMessage(text)).catch(() => '');
      const kind: AzureDevOpsErrorKind =
        response.status === 401 ? 'UNAUTHORIZED' : response.status === 403 ? 'FORBIDDEN' : response.status === 404 ? 'NOT_FOUND' : response.status >= 500 || response.status === 429 ? 'UNAVAILABLE' : 'UNKNOWN';
      this.logger.warn(`${method} ${target.pathname} -> ${response.status} ${detail}`);
      throw new AzureDevOpsApiError(kind, response.status, detail || `Azure DevOps answered ${response.status}`);
    }
    return (await response.json()) as T;
  }
}

function enc(segment: string): string {
  return encodeURIComponent(segment);
}

function extractMessage(text: string): string {
  try {
    const parsed = JSON.parse(text) as { message?: string };
    return (parsed.message ?? '').slice(0, 300);
  } catch {
    return text.slice(0, 200);
  }
}
