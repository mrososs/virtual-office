import type { AzureDevOpsConnectionStatus } from '@virtual-office/shared';
import type { AzureCredentialUnavailableError } from './credentials/azure-devops-credential';
import type { AzureConnection, AzureConnectionState } from './repositories/azure-connection.repository';

/** Connection states that need the employee's attention. */
export type ProblemState = Exclude<AzureConnectionState, 'CONNECTED' | 'DISCONNECTED'>;

export interface Verdict {
  state: AzureConnectionState;
  message: string | null;
}

export interface ProblemVerdict {
  state: ProblemState;
  message: string;
}

export function toApiStatus(state: AzureConnectionState): AzureDevOpsConnectionStatus {
  return state === 'DISCONNECTED' ? 'NOT_CONNECTED' : state;
}

/** Azure DevOps answers 401 for mistyped, revoked and expired PATs alike; a known expiry date tells them apart. */
export function rejectedVerdict(connection: Pick<AzureConnection, 'patExpiresAt' | 'credentialType'>): ProblemVerdict {
  if (connection.credentialType === 'ENTRA') return { state: 'EXPIRED', message: 'Microsoft consent expired or was revoked. Reconnect Azure DevOps.' };
  if (connection.patExpiresAt && Date.parse(connection.patExpiresAt) <= Date.now()) {
    return { state: 'EXPIRED', message: `Your Azure DevOps token expired on ${connection.patExpiresAt.slice(0, 10)}. Create a new token and update it.` };
  }
  return { state: 'INVALID', message: 'Azure DevOps rejected the saved token (revoked, expired or changed). Create a new token and update it.' };
}

export function credentialProblemVerdict(error: AzureCredentialUnavailableError, connection: Pick<AzureConnection, 'patExpiresAt' | 'credentialType'>): ProblemVerdict {
  if (error.problem === 'EXPIRED') return rejectedVerdict(connection);
  if (error.problem === 'UNREADABLE') return { state: 'INVALID', message: 'The saved token can no longer be decrypted on the server. Update your token.' };
  return { state: 'INVALID', message: 'No Azure DevOps token is saved. Update your token.' };
}
