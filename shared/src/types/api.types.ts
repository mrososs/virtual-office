import type { EmployeeActivity } from './activity.types.js';
import type { AvatarProfile } from './avatar.types.js';
import type { ISODateString, UUID } from './common.types.js';
import type { Meeting } from './meeting.types.js';
import type { EmployeePresence } from './presence.types.js';
import type { EmployeeRole } from './role.types.js';
import type { Build, PullRequest, Sprint, WorkItem } from './work.types.js';

/**
 * HTTP contracts between the NestJS API and the Vue client. Whatever proves
 * who someone is (an Azure DevOps PAT today, Microsoft Entra later) is
 * normalized into these internal shapes on the server: nothing here carries
 * provider tokens, PATs or raw Microsoft / Azure DevOps claims.
 */

/* Authentication mode ------------------------------------------------------ */

/**
 * How people sign in to this deployment (backend `AUTH_PROVIDER`):
 * - `azure_pat` — work email + Azure DevOps Personal Access Token, verified against Azure DevOps (current)
 * - `microsoft_entra` — Microsoft Entra ID single sign-on (needs an IT-approved app registration)
 * - `demo` — no real sign-in; demo identities only (development)
 */
export type AuthProviderId = 'azure_pat' | 'microsoft_entra' | 'demo';

/** Public, unauthenticated: tells the login page which sign-in to show. */
export interface AuthConfigResponse {
  provider: AuthProviderId;
  azureDevOps: {
    /** Organization a PAT must belong to (https://dev.azure.com/<organization>). */
    organization: string | null;
    project: string | null;
  };
}

export interface AzurePatLoginRequest {
  email: string;
  /** Sent once over HTTPS, encrypted at rest by the server, never returned. */
  token: string;
  /** Optional expiry date the employee chose when creating the token (YYYY-MM-DD). */
  expiresOn?: string | null;
}

/** Why an Azure DevOps token sign-in (or token update) was refused (`{ message: { code } }`). */
export type AzurePatErrorCode =
  /** Azure DevOps rejected the token: mistyped, expired or revoked. */
  | 'invalid_token'
  /** The token is valid but belongs to a different account than the email entered. */
  | 'email_mismatch'
  /** Azure DevOps did not return a verifiable email for the token's owner. */
  | 'identity_unverifiable'
  | 'not_authorized'
  | 'account_disabled'
  | 'rate_limited'
  | 'not_configured'
  | 'service_unavailable';

/* Session ---------------------------------------------------------------- */

/** The signed-in employee as the app knows them (roles come from our database, never from Microsoft). */
export interface SessionEmployee {
  id: UUID;
  displayName: string;
  email: string;
  role: EmployeeRole;
  /** What they do, e.g. "Developer / Team Lead" (null → show the role label). */
  jobTitle: string | null;
  team: string | null;
  discipline: string | null;
  /** Null until the employee saves an avatar for the first time. */
  avatar: AvatarProfile | null;
  assignedDeskId: UUID | null;
}

/**
 * `POST /api/auth/realtime-ticket`: a single-use, 60-second credential for the Socket.IO
 * handshake when the socket host is another site than the SPA (the session cookie cannot reach it).
 */
export interface RealtimeTicketResponse {
  ticket: string;
  expiresAt: ISODateString;
}

export interface AuthMeResponse {
  employee: SessionEmployee;
  organization: { id: UUID; name: string };
  session: { expiresAt: ISODateString; provider: AuthProviderId };
  /** Last known state of the employee's own integrations — never blocks entering the office. */
  integrations: { azureDevOps: AzureDevOpsConnectionStatus };
}

/** Reasons a Microsoft sign-in ends on /login instead of the office (`/login?error=<code>`). */
export type SignInErrorCode =
  | 'not_authorized'
  | 'account_disabled'
  | 'wrong_tenant'
  | 'cancelled'
  | 'login_expired'
  | 'consent_required'
  | 'not_configured'
  | 'service_unavailable'
  | 'login_failed';

/* Office state ----------------------------------------------------------- */

/**
 * One team member as the API sends them. Desk coordinates are not included:
 * the client resolves `assignedDeskId` against the floor plan it renders.
 */
export interface OfficeMemberDto {
  id: UUID;
  displayName: string;
  email: string;
  role: EmployeeRole;
  jobTitle: string | null;
  team: string | null;
  discipline: string | null;
  assignedDeskId: UUID | null;
  presence: EmployeePresence;
  activity: EmployeeActivity;
}

export interface WorkSnapshot {
  workItems: WorkItem[];
  pullRequests: PullRequest[];
  builds: Build[];
  sprint: Sprint | null;
  /** When Azure DevOps data was last synced; null before the first successful sync. */
  syncedAt: ISODateString | null;
}

export interface OfficeStateResponse {
  organization: { id: UUID; name: string };
  officeId: UUID;
  floorId: UUID;
  members: OfficeMemberDto[];
  avatarProfiles: AvatarProfile[];
  meetings: Meeting[];
  work: WorkSnapshot;
}

/* Integrations ----------------------------------------------------------- */

export type AzureDevOpsConnectionStatus =
  /** AZURE_DEVOPS_ORGANIZATION / AZURE_DEVOPS_PROJECT are not set on the server. */
  | 'NOT_CONFIGURED'
  /** No usable credential (never connected, or disconnected by the employee). */
  | 'NOT_CONNECTED'
  | 'CONNECTED'
  /** Past its expiry (PAT expiry date, or Entra consent/refresh expired): needs renewing. */
  | 'EXPIRED'
  /** Azure DevOps rejects the credential: mistyped, revoked, or expired without a known date. */
  | 'INVALID'
  /** The credential works but cannot read the configured organization/project (access or token scopes). */
  | 'ERROR';

/** Which kind of credential backs an Azure DevOps connection. */
export type AzureDevOpsCredentialType = 'PAT' | 'ENTRA';

/** Outcome of "Connect Azure DevOps" (`/integrations?azureDevOps=<result>`). */
export type AzureDevOpsConnectResult =
  | 'connected'
  /** The Microsoft account chosen for consent is not the one signed in to the Virtual Office. */
  | 'account_mismatch'
  | 'organization_inaccessible'
  | 'project_inaccessible'
  | 'consent_required'
  | 'cancelled'
  | 'not_configured'
  | 'service_unavailable'
  | 'failed';

export type AzureSyncRunStatus = 'RUNNING' | 'SUCCEEDED' | 'FAILED';

export interface AzureSyncNowResponse {
  outcome: 'SUCCEEDED' | 'FAILED' | 'SKIPPED';
  reason: string | null;
}

export interface AzureSyncSummary {
  status: AzureSyncRunStatus | null;
  startedAt: ISODateString | null;
  finishedAt: ISODateString | null;
  lastSuccessAt: ISODateString | null;
  error: string | null;
  workItemCount: number;
  pullRequestCount: number;
  buildCount: number;
}

export interface IntegrationsStatusResponse {
  authProvider: AuthProviderId;
  /** Only in `microsoft_entra` mode: the Microsoft account the employee signed in with. */
  microsoft: { connected: boolean; email: string; displayName: string } | null;
  azureDevOps: {
    status: AzureDevOpsConnectionStatus;
    credentialType: AzureDevOpsCredentialType | null;
    organization: string | null;
    project: string | null;
    team: string | null;
    /** The Azure DevOps identity verified for the signed-in employee, once connected. */
    identity: { displayName: string; uniqueName: string } | null;
    /** Expiry the employee entered for their PAT, if any. */
    tokenExpiresAt: ISODateString | null;
    lastVerifiedAt: ISODateString | null;
    /** Last successful team sync that used this employee's credential. */
    lastSyncAt: ISODateString | null;
    lastError: string | null;
    sync: AzureSyncSummary;
    syncIntervalSeconds: number;
  };
  /** Teams / Calendar need an IT-approved Microsoft Entra app registration (Microsoft Graph). */
  teams: { status: 'UNAVAILABLE' };
}

/** Result of saving or re-verifying an employee's own Azure DevOps token. */
export interface AzureTokenUpdateResponse {
  status: AzureDevOpsConnectionStatus;
  /** Why the connection is not CONNECTED (e.g. a missing token scope), if so. */
  message: string | null;
}
