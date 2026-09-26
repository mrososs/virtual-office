import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type {
  AzureDevOpsConnectionStatus,
  AzureDevOpsConnectResult,
  AzureTokenUpdateResponse,
  IntegrationsStatusResponse,
  UUID,
} from '@virtual-office/shared';
import { AppConfig } from '../../config/configuration';
import type { EmployeeRecord } from '../employees/employee.record';
import type { EntraFlowResult } from '../entra/entra-auth-code-flow.service';
import { MicrosoftTokenService } from '../entra/microsoft-token.service';
import type { AuthContext } from '../session/session.types';
import { AzureDevOpsApiClient, AzureDevOpsApiError } from './azure-devops-api.client';
import { credentialProblemVerdict, rejectedVerdict, toApiStatus, type Verdict } from './azure-connection-verdicts';
import { AzurePatError } from './azure-pat.errors';
import { AzureSyncService } from './azure-sync.service';
import type { AzureIdentityRef } from './azure.types';
import { AzureCredentialService } from './credentials/azure-credential.service';
import { AzureCredentialUnavailableError, patCredential, type AzureDevOpsCredential } from './credentials/azure-devops-credential';
import { AzureConnectionRepository, type AzureConnection } from './repositories/azure-connection.repository';
import { AzureIdentityRepository } from './repositories/azure-identity.repository';
import { AzureSyncStateRepository } from './repositories/azure-sync-state.repository';

/** Future Entra mode: consent round trip failed in a way the Integrations page explains. */
export class AzureConnectError extends Error {
  constructor(
    readonly result: Exclude<AzureDevOpsConnectResult, 'connected'>,
    detail: string,
  ) {
    super(detail);
    this.name = 'AzureConnectError';
  }
}

/** Opportunistic re-verification when an employee opens the app: at most every 30 min, only if older than 6 h. */
const BACKGROUND_CHECK_THROTTLE_MS = 30 * 60_000;
const BACKGROUND_CHECK_MAX_AGE_MS = 6 * 60 * 60_000;

/**
 * An employee's own Azure DevOps connection. Current mode: a Personal Access
 * Token the employee enters once (at sign-in or "Update token"), verified
 * against Azure DevOps, sealed with AES-256-GCM and stored server-side — it is
 * never returned to the browser. Future mode: delegated Entra consent.
 *
 * Verification answers two questions: whose token is this (connectionData →
 * Azure identity, which must be this employee's), and can it read the
 * configured project (Project and Team: Read + membership).
 */
@Injectable()
export class AzureDevOpsConnectionService {
  private readonly logger = new Logger(AzureDevOpsConnectionService.name);
  private readonly syncIntervalSeconds: number;
  private readonly lastBackgroundCheck = new Map<UUID, number>();

  constructor(
    configService: ConfigService,
    private readonly api: AzureDevOpsApiClient,
    private readonly credentials: AzureCredentialService,
    private readonly microsoftTokens: MicrosoftTokenService,
    private readonly connections: AzureConnectionRepository,
    private readonly identities: AzureIdentityRepository,
    private readonly syncState: AzureSyncStateRepository,
    private readonly sync: AzureSyncService,
  ) {
    this.syncIntervalSeconds = configService.get<AppConfig>('app')!.azureDevOps.syncIntervalSeconds;
  }

  isConfigured(): boolean {
    return this.api.isConfigured();
  }

  isOrganizationConfigured(): boolean {
    return this.api.isOrganizationConfigured();
  }

  /* PAT ------------------------------------------------------------------------ */

  /** Asks Azure DevOps whose token this is. The PAT itself is never logged. */
  async inspectPat(pat: string): Promise<AzureIdentityRef> {
    if (!this.api.isOrganizationConfigured()) throw new AzurePatError('not_configured', 'AZURE_DEVOPS_ORGANIZATION is not set');
    try {
      return await this.api.getConnectionData(patCredential(pat));
    } catch (error) {
      if (error instanceof AzureDevOpsApiError && (error.kind === 'UNAUTHORIZED' || error.kind === 'FORBIDDEN')) {
        throw new AzurePatError('invalid_token', `connectionData refused (${error.status})`);
      }
      if (error instanceof AzureDevOpsApiError && error.kind === 'NOT_FOUND') {
        // Azure DevOps answers 404 for an organization that does not exist: a server misconfiguration, not the user's token.
        this.logger.error(`Azure DevOps organization "${this.api.organization}" was not found — check AZURE_DEVOPS_ORGANIZATION`);
        throw new AzurePatError('not_configured', 'organization not found');
      }
      throw new AzurePatError('service_unavailable', error instanceof Error ? error.message : 'Azure DevOps unreachable');
    }
  }

  /** The verified email of a token's owner (Azure's `uniqueName` for Entra-backed organizations). */
  verifiedEmailOf(identity: AzureIdentityRef): string | null {
    const email = identity.uniqueName?.trim().toLowerCase();
    return email && email.includes('@') ? email : null;
  }

  /**
   * Saves (or replaces) the employee's PAT after proving it is theirs. Pass the
   * identity when the caller already inspected the token (sign-in).
   */
  async savePat(employee: EmployeeRecord, pat: string, expiresOn: string | null, knownIdentity?: AzureIdentityRef): Promise<AzureTokenUpdateResponse> {
    const identity = knownIdentity ?? (await this.inspectPat(pat));
    await this.assertOwnedBy(identity, employee);
    await this.identities.saveVerified(employee.id, identity);

    const credential = patCredential(pat);
    const verdict = await this.checkProjectAccess(credential);
    await this.connections.savePat(employee.id, this.credentials.sealPat(pat), expiresOn ? new Date(expiresOn).toISOString() : null, {
      status: verdict.state,
      lastError: verdict.message,
      organization: this.api.organization,
      project: this.api.project || null,
    });
    this.logger.log(`Employee ${employee.id} saved an Azure DevOps token (${verdict.state})`);
    if (verdict.state === 'CONNECTED') void this.sync.syncNow(employee.id);
    return { status: toApiStatus(verdict.state), message: verdict.message };
  }

  /** Re-checks the stored credential against Azure DevOps now. */
  async verify(employeeId: UUID): Promise<AzureTokenUpdateResponse> {
    const connection = await this.connections.find(employeeId);
    if (!connection || connection.status === 'DISCONNECTED') return { status: 'NOT_CONNECTED', message: null };
    const verdict = await this.verifyConnection(connection);
    return { status: toApiStatus(verdict.state), message: verdict.message };
  }

  /** Fire-and-forget check when the employee opens the app, so an expired token is noticed without blocking anything. */
  refreshIfStale(employeeId: UUID): void {
    const now = Date.now();
    if (now - (this.lastBackgroundCheck.get(employeeId) ?? 0) < BACKGROUND_CHECK_THROTTLE_MS) return;
    this.lastBackgroundCheck.set(employeeId, now);
    void (async () => {
      const connection = await this.connections.find(employeeId);
      if (!connection || connection.status !== 'CONNECTED') return;
      if (connection.lastVerifiedAt && now - Date.parse(connection.lastVerifiedAt) < BACKGROUND_CHECK_MAX_AGE_MS) return;
      await this.verifyConnection(connection);
    })().catch((error: unknown) => this.logger.warn(`Background Azure check failed: ${error instanceof Error ? error.message : String(error)}`));
  }

  /** Forgets the employee's credential (the sealed PAT is erased). Their employee account is untouched. */
  async disconnect(employeeId: UUID): Promise<void> {
    await this.connections.disconnect(employeeId);
  }

  /* Status ------------------------------------------------------------------ */

  async statusFor(employeeId: UUID): Promise<AzureDevOpsConnectionStatus> {
    if (!this.api.isConfigured()) return 'NOT_CONFIGURED';
    const connection = await this.connections.find(employeeId);
    return connection ? toApiStatus(connection.status) : 'NOT_CONNECTED';
  }

  async status(auth: AuthContext): Promise<IntegrationsStatusResponse['azureDevOps']> {
    const [connection, identity, sync] = await Promise.all([
      this.connections.find(auth.employee.id),
      this.identities.findByEmployee(auth.employee.id),
      this.syncState.get(),
    ]);
    const usable = connection && connection.status !== 'DISCONNECTED' ? connection : null;
    return {
      status: !this.api.isConfigured() ? 'NOT_CONFIGURED' : usable ? toApiStatus(usable.status) : 'NOT_CONNECTED',
      credentialType: usable?.credentialType ?? null,
      organization: this.api.organization || null,
      project: this.api.project || null,
      team: sync.teamName ?? (this.api.teamName || null),
      identity: usable && identity?.matchMethod === 'VERIFIED_SIGN_IN' ? { displayName: identity.azureDisplayName, uniqueName: identity.azureUniqueName } : null,
      tokenExpiresAt: usable?.patExpiresAt ?? null,
      lastVerifiedAt: usable?.lastVerifiedAt ?? null,
      lastSyncAt: usable?.lastSyncAt ?? null,
      lastError: usable?.lastError ?? null,
      sync: {
        status: sync.status,
        startedAt: sync.startedAt,
        finishedAt: sync.finishedAt,
        lastSuccessAt: sync.lastSuccessAt,
        error: sync.error,
        workItemCount: sync.workItemCount,
        pullRequestCount: sync.pullRequestCount,
        buildCount: sync.buildCount,
      },
      syncIntervalSeconds: this.syncIntervalSeconds,
    };
  }

  /* Future: Microsoft Entra delegated consent --------------------------------- */

  async completeEntraConnect(auth: AuthContext, result: EntraFlowResult): Promise<void> {
    const { employee } = auth;
    if (!this.api.isConfigured()) throw new AzureConnectError('not_configured', 'Azure DevOps organization/project not configured');
    if (result.identity.objectId !== employee.entraObjectId || result.identity.tenantId !== employee.entraTenantId) {
      throw new AzureConnectError('account_mismatch', 'consent given with a different Microsoft account');
    }
    await this.microsoftTokens.storeCache(employee.id, result.tokenCache.homeAccountId, result.tokenCache.serialized);
    await this.connections.saveEntra(employee.id, { status: 'CONNECTED', lastError: null, organization: this.api.organization, project: this.api.project });

    const connection = await this.connections.find(employee.id);
    let credential: AzureDevOpsCredential;
    try {
      credential = await this.credentials.forConnection(connection!);
    } catch {
      throw new AzureConnectError('consent_required', 'no delegated Azure DevOps token after consent');
    }
    let identity: AzureIdentityRef;
    try {
      identity = await this.api.getConnectionData(credential);
      await this.api.getProject(credential);
    } catch (error) {
      const kind = error instanceof AzureDevOpsApiError ? error.kind : 'UNKNOWN';
      throw new AzureConnectError(kind === 'UNAVAILABLE' ? 'service_unavailable' : 'project_inaccessible', error instanceof Error ? error.message : 'Azure DevOps check failed');
    }
    await this.identities.saveVerified(employee.id, identity);
    void this.sync.syncNow(employee.id);
  }

  /* Internals ----------------------------------------------------------------- */

  /** The token must be this employee's: already linked to them, or its verified email is theirs. */
  private async assertOwnedBy(identity: AzureIdentityRef, employee: EmployeeRecord): Promise<void> {
    const linked = await this.identities.findByIdentityId(identity.id);
    if (linked) {
      if (linked.employeeId !== employee.id) throw new AzurePatError('email_mismatch', 'token belongs to another employee');
      return;
    }
    const email = this.verifiedEmailOf(identity);
    if (!email) throw new AzurePatError('identity_unverifiable', 'connectionData returned no email');
    if (email !== employee.email) throw new AzurePatError('email_mismatch', 'token email differs from the employee');
  }

  private async verifyConnection(connection: AzureConnection): Promise<Verdict> {
    let credential: AzureDevOpsCredential;
    try {
      credential = await this.credentials.forConnection(connection);
    } catch (error) {
      if (!(error instanceof AzureCredentialUnavailableError)) throw error;
      const verdict = credentialProblemVerdict(error, connection);
      await this.connections.markProblem(connection.employeeId, verdict.state, verdict.message);
      return verdict;
    }

    try {
      await this.api.getConnectionData(credential);
    } catch (error) {
      if (error instanceof AzureDevOpsApiError && error.kind === 'UNAUTHORIZED') {
        const verdict = rejectedVerdict(connection);
        await this.connections.markProblem(connection.employeeId, verdict.state, verdict.message);
        return verdict;
      }
      // Azure DevOps is down or answered oddly: that says nothing about the token.
      return { state: connection.status, message: connection.lastError };
    }

    const verdict = await this.checkProjectAccess(credential);
    if (verdict.state === 'CONNECTED') await this.connections.markVerified(connection.employeeId);
    else await this.connections.markProblem(connection.employeeId, 'ERROR', verdict.message ?? '');
    return verdict;
  }

  /** Project and Team (Read) + project membership. A missing project config is not the token's fault. */
  private async checkProjectAccess(credential: AzureDevOpsCredential): Promise<Verdict> {
    if (!this.api.project) return { state: 'CONNECTED', message: null };
    try {
      await this.api.getProject(credential);
      return { state: 'CONNECTED', message: null };
    } catch (error) {
      if (error instanceof AzureDevOpsApiError && error.kind !== 'UNAVAILABLE' && error.kind !== 'UNKNOWN') {
        return {
          state: 'ERROR',
          message: `This token can't read the project "${this.api.project}". Give it the "Project and Team (Read)" scope and make sure you are a member of the project.`,
        };
      }
      return { state: 'CONNECTED', message: null };
    }
  }
}

