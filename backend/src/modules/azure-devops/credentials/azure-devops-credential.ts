/**
 * What the Azure DevOps client needs to call the REST API on someone's
 * behalf: a ready `Authorization` header value. Where it comes from — an
 * employee's PAT today, a delegated Entra token or a team credential later —
 * is decided by `AzureCredentialService`; nothing downstream knows.
 */
export interface AzureDevOpsCredential {
  readonly authorization: string;
}

/** Azure DevOps accepts a PAT as HTTP Basic auth with an empty user name: base64(":" + PAT). */
export function patCredential(pat: string): AzureDevOpsCredential {
  return { authorization: `Basic ${Buffer.from(`:${pat}`, 'utf8').toString('base64')}` };
}

export function bearerCredential(accessToken: string): AzureDevOpsCredential {
  return { authorization: `Bearer ${accessToken}` };
}

export type AzureCredentialProblem =
  /** No stored credential (never connected / disconnected). */
  | 'MISSING'
  /** Stored but cannot be decrypted (TOKEN_ENCRYPTION_KEY changed). */
  | 'UNREADABLE'
  /** Past the expiry date the employee entered, or Entra consent/refresh token expired. */
  | 'EXPIRED';

export class AzureCredentialUnavailableError extends Error {
  constructor(readonly problem: AzureCredentialProblem) {
    super(`Azure DevOps credential unavailable (${problem})`);
    this.name = 'AzureCredentialUnavailableError';
  }
}
