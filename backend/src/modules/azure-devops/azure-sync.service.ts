import { Injectable, Logger, OnApplicationBootstrap, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { AzureSyncNowResponse, UUID } from '@virtual-office/shared';
import { SupabaseService } from '../../common/supabase/supabase.service';
import { AppConfig } from '../../config/configuration';
import { ActivityEngine } from '../activities/activity-engine.service';
import type { EmployeeRecord } from '../employees/employee.record';
import { EmployeeRepository } from '../employees/employee.repository';
import { deriveAzureSignals, type AzureSignalInput } from './azure-activity.mapper';
import { credentialProblemVerdict, rejectedVerdict, type ProblemVerdict } from './azure-connection-verdicts';
import { AzureDevOpsApiClient, AzureDevOpsApiError } from './azure-devops-api.client';
import { AzureEmployeeResolver, toBuildRow, toPullRequestRow, toWorkItemRow } from './azure-work.mapper';
import type { AzureIdentityRef } from './azure.types';
import { AzureCredentialService } from './credentials/azure-credential.service';
import { AzureCredentialUnavailableError, type AzureDevOpsCredential } from './credentials/azure-devops-credential';
import { AzureBuildRepository } from './repositories/azure-build.repository';
import { AzureConnectionRepository, type AzureConnection } from './repositories/azure-connection.repository';
import { AzureIdentityRepository } from './repositories/azure-identity.repository';
import { AzurePullRequestRepository } from './repositories/azure-pull-request.repository';
import { AzureSyncStateRepository } from './repositories/azure-sync-state.repository';
import { AzureWorkItemRepository } from './repositories/azure-work-item.repository';
import { WorkSyncEvents } from './work-sync-events';

const RECENT_BUILDS_MS = 24 * 60 * 60_000;
const STARTUP_DELAY_MS = 10_000;

/**
 * Phase 1 Azure DevOps sync: a scheduled pull (AZURE_DEVOPS_SYNC_INTERVAL_SECONDS,
 * default 120 s, min 60 s) of the configured project's current-iteration work
 * items, active pull requests and last-24h builds — no history, no source.
 *
 * Credentials: each run uses one healthy connection (most recently verified
 * first) — today an employee's own PAT, later a delegated Entra token or a
 * team credential; the credential source never reaches the Activity Engine,
 * which only sees the normalized tables. A failing connection is marked
 * (EXPIRED / INVALID / ERROR) and the next one is tried, so the office sees
 * what that team member can see, with one set of API calls per run.
 * Service Hooks (push) remain the future path; see docs/AZURE_DEVOPS_SETUP.md.
 */
@Injectable()
export class AzureSyncService implements OnApplicationBootstrap, OnModuleDestroy {
  private readonly logger = new Logger(AzureSyncService.name);
  private readonly intervalMs: number;
  private readonly signalTtlMs: number;
  private timers: NodeJS.Timeout[] = [];
  private running: Promise<AzureSyncNowResponse> | null = null;

  constructor(
    configService: ConfigService,
    private readonly supabase: SupabaseService,
    private readonly api: AzureDevOpsApiClient,
    private readonly credentials: AzureCredentialService,
    private readonly employees: EmployeeRepository,
    private readonly identities: AzureIdentityRepository,
    private readonly connections: AzureConnectionRepository,
    private readonly syncState: AzureSyncStateRepository,
    private readonly workItems: AzureWorkItemRepository,
    private readonly pullRequests: AzurePullRequestRepository,
    private readonly builds: AzureBuildRepository,
    private readonly activityEngine: ActivityEngine,
    private readonly events: WorkSyncEvents,
  ) {
    this.intervalMs = configService.get<AppConfig>('app')!.azureDevOps.syncIntervalSeconds * 1000;
    // Signals outlive a couple of missed runs, then expire so stale work never looks current.
    this.signalTtlMs = Math.max(3 * this.intervalMs, 5 * 60_000);
  }

  onApplicationBootstrap(): void {
    if (!this.supabase.isConfigured()) return;
    void this.restoreActivityFromStore();
    if (!this.api.isConfigured()) {
      this.logger.log('Azure DevOps sync disabled: AZURE_DEVOPS_ORGANIZATION / AZURE_DEVOPS_PROJECT not set');
      return;
    }
    const first = setTimeout(() => void this.syncNow(), STARTUP_DELAY_MS);
    const every = setInterval(() => void this.syncNow(), this.intervalMs);
    first.unref();
    every.unref();
    this.timers = [first, every];
  }

  onModuleDestroy(): void {
    for (const timer of this.timers) clearTimeout(timer);
  }

  /** Runs a sync now (or joins the one in flight). `preferredEmployeeId`'s token is tried first. */
  syncNow(preferredEmployeeId?: UUID): Promise<AzureSyncNowResponse> {
    if (!this.api.isConfigured()) return Promise.resolve({ outcome: 'SKIPPED', reason: 'not_configured' });
    this.running ??= this.run(preferredEmployeeId).finally(() => (this.running = null));
    return this.running;
  }

  private async run(preferredEmployeeId?: UUID): Promise<AzureSyncNowResponse> {
    try {
      const usable = await this.connections.listUsable();
      const ordered = [
        ...usable.filter((connection) => connection.employeeId === preferredEmployeeId),
        ...usable.filter((connection) => connection.employeeId !== preferredEmployeeId),
      ];
      if (ordered.length === 0) return { outcome: 'SKIPPED', reason: 'no_connected_employee' };

      const startedAt = new Date().toISOString();
      await this.syncState.markRunning(startedAt);
      let lastError = 'No connected employee could read Azure DevOps';

      for (const connection of ordered) {
        let credential: AzureDevOpsCredential;
        try {
          credential = await this.credentials.forConnection(connection);
        } catch (error) {
          if (!(error instanceof AzureCredentialUnavailableError)) throw error;
          const verdict = credentialProblemVerdict(error, connection);
          await this.connections.markProblem(connection.employeeId, verdict.state, verdict.message);
          lastError = verdict.message;
          continue;
        }
        try {
          await this.pull(credential, connection.employeeId, startedAt);
          await this.connections.markSynced(connection.employeeId);
          return { outcome: 'SUCCEEDED', reason: null };
        } catch (error) {
          if (error instanceof AzureDevOpsApiError && error.kind === 'UNAVAILABLE') {
            lastError = 'Azure DevOps is unavailable right now.';
            break; // Azure DevOps itself is down — other credentials would fail the same way.
          }
          // This credential is the problem (rejected, missing scope, no project access): mark it and try the next one.
          const verdict = error instanceof AzureSyncStepError ? error.verdict(connection) : { state: 'ERROR' as const, message: error instanceof Error ? error.message : String(error) };
          await this.connections.markProblem(connection.employeeId, verdict.state, verdict.message);
          lastError = verdict.message;
        }
      }

      this.logger.warn(`Azure DevOps sync failed: ${lastError}`);
      await this.syncState.markFailed(lastError);
      return { outcome: 'FAILED', reason: lastError };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Azure DevOps sync crashed: ${message}`);
      return { outcome: 'FAILED', reason: 'The sync failed on the server. Check the backend logs.' };
    }
  }

  private async pull(credential: AzureDevOpsCredential, employeeId: UUID, startedAt: string): Promise<void> {
    const project = await step('Project and Team (Read)', () => this.api.getProject(credential), true);
    const team = this.api.teamName ? await step('Project and Team (Read)', () => this.api.getTeam(credential, project.id, this.api.teamName)) : project.defaultTeam;
    if (!team) throw new AzureDevOpsApiError('NOT_FOUND', 404, `Project ${project.name} has no default team — set AZURE_DEVOPS_TEAM`);

    const [members, iteration, employees] = await Promise.all([
      step('Project and Team (Read)', () => this.api.getTeamMembers(credential, project.id, team.id)),
      step('Work Items (Read)', () => this.api.getCurrentIteration(credential, project.id, team.id)),
      this.employees.listActive(),
    ]);
    await this.mapTeamMembersByEmail(members, employees);
    const resolver = new AzureEmployeeResolver(await this.identities.listAll(), employees);

    const ids = await step('Work Items (Read)', () => this.api.queryWorkItemIds(credential, project.id, team.id, iteration?.path ?? null));
    const [items, prs, builds] = await Promise.all([
      step('Work Items (Read)', () => this.api.getWorkItems(credential, project.id, ids)),
      step('Code (Read)', () => this.api.getActivePullRequests(credential, project.id)),
      step('Build (Read)', () => this.api.getRecentBuilds(credential, project.id, new Date(Date.now() - RECENT_BUILDS_MS))),
    ]);

    const rows: AzureSignalInput = {
      workItems: items.map((item) => toWorkItemRow(item, resolver, this.api.workItemUrl(item.id), startedAt)),
      pullRequests: prs.map((pr) => toPullRequestRow(pr, resolver, this.api.pullRequestUrl(pr.repository.name, pr.pullRequestId), startedAt)),
      builds: builds.map((build) => toBuildRow(build, resolver, this.api.buildUrl(build.id), startedAt)),
    };
    await this.workItems.replaceAll([...rows.workItems], startedAt);
    await this.pullRequests.replaceAll([...rows.pullRequests], startedAt);
    await this.builds.replaceAll([...rows.builds], startedAt);

    const finishedAt = new Date().toISOString();
    await this.syncState.markSucceeded({
      finishedAt,
      employeeId,
      project: { id: project.id, name: project.name },
      team: { id: team.id, name: team.name },
      iteration: iteration
        ? { id: iteration.id, name: iteration.name, path: iteration.path, start: iteration.attributes.startDate ?? null, end: iteration.attributes.finishDate ?? null }
        : null,
      counts: { workItems: rows.workItems.length, pullRequests: rows.pullRequests.length, builds: rows.builds.length },
    });

    this.activityEngine.replaceSource('AZURE_DEVOPS', deriveAzureSignals(rows, Date.now(), this.signalTtlMs));
    this.events.emitSynced({ syncedAt: finishedAt });
    this.logger.log(`Azure DevOps synced: ${rows.workItems.length} work items, ${rows.pullRequests.length} PRs, ${rows.builds.length} builds`);
  }

  /** Team members whose Azure uniqueName equals an employee email get an EMAIL mapping (verified ones are kept). */
  private async mapTeamMembersByEmail(members: AzureIdentityRef[], employees: EmployeeRecord[]): Promise<void> {
    const existing = await this.identities.listAll();
    const mappedEmployees = new Set(existing.map((mapping) => mapping.employeeId));
    const mappedIdentities = new Set(existing.map((mapping) => mapping.azureIdentityId));
    const employeeByEmail = new Map(employees.map((employee) => [employee.email, employee]));
    for (const member of members) {
      const employee = employeeByEmail.get(member.uniqueName?.toLowerCase() ?? '');
      if (!employee || mappedEmployees.has(employee.id) || mappedIdentities.has(member.id)) continue;
      await this.identities.addEmailMatch(employee.id, member);
      mappedEmployees.add(employee.id);
      mappedIdentities.add(member.id);
    }
  }

  /** After a restart, rebuild Azure activity from the last stored sync — if it is still recent enough to be true. */
  private async restoreActivityFromStore(): Promise<void> {
    try {
      const state = await this.syncState.get();
      const age = state.lastSuccessAt ? Date.now() - Date.parse(state.lastSuccessAt) : Number.POSITIVE_INFINITY;
      if (age >= this.signalTtlMs) return;
      const [workItems, pullRequests, builds] = await Promise.all([this.workItems.listAll(), this.pullRequests.listAll(), this.builds.listAll()]);
      this.activityEngine.replaceSource('AZURE_DEVOPS', deriveAzureSignals({ workItems, pullRequests, builds }, Date.now(), this.signalTtlMs - age));
    } catch (error) {
      this.logger.warn(`Could not restore Azure activity: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}

/**
 * One labelled step of a sync. A token that got as far as the first step is
 * valid, so a later 401/403 means a missing PAT scope (or no access to that
 * area) — worth telling the employee exactly which one.
 */
class AzureSyncStepError extends Error {
  constructor(
    private readonly scopeLabel: string,
    private readonly firstStep: boolean,
    readonly apiError: AzureDevOpsApiError,
  ) {
    super(`${scopeLabel} request failed (${apiError.status})`);
    this.name = 'AzureSyncStepError';
  }

  verdict(connection: AzureConnection): ProblemVerdict {
    if (this.firstStep && this.apiError.kind === 'UNAUTHORIZED') return rejectedVerdict(connection);
    return {
      state: 'ERROR',
      message: `This token can't read ${this.scopeLabel.replace(' (Read)', '')} data. Give it the "${this.scopeLabel}" scope and make sure you have access to the project.`,
    };
  }
}

async function step<T>(scopeLabel: string, call: () => Promise<T>, firstStep = false): Promise<T> {
  try {
    return await call();
  } catch (error) {
    if (error instanceof AzureDevOpsApiError && (error.kind === 'UNAUTHORIZED' || error.kind === 'FORBIDDEN' || error.kind === 'NOT_FOUND')) {
      throw new AzureSyncStepError(scopeLabel, firstStep, error);
    }
    throw error;
  }
}
