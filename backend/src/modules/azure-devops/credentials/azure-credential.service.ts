import { Injectable } from '@nestjs/common';
import { CryptoService } from '../../../common/security/crypto.service';
import { AZURE_DEVOPS_SCOPES } from '../../entra/entra-scopes';
import { MicrosoftReauthRequiredError } from '../../entra/entra.errors';
import { MicrosoftTokenService } from '../../entra/microsoft-token.service';
import type { AzureConnection } from '../repositories/azure-connection.repository';
import { AzureCredentialUnavailableError, bearerCredential, patCredential, type AzureDevOpsCredential } from './azure-devops-credential';

/**
 * Turns a stored connection into a usable credential, just before a call:
 *  - PAT (current mode): open the AES-256-GCM sealed value (TOKEN_ENCRYPTION_KEY) → Basic auth
 *  - ENTRA (future mode, needs an app registration): mint a delegated token → Bearer
 * The plaintext PAT exists only in memory for the duration of the request.
 * A team-wide/service credential would be one more branch here.
 */
@Injectable()
export class AzureCredentialService {
  constructor(
    private readonly crypto: CryptoService,
    private readonly microsoftTokens: MicrosoftTokenService,
  ) {}

  /** What the database stores for a PAT. */
  sealPat(pat: string): string {
    return this.crypto.sealProviderToken(pat);
  }

  async forConnection(connection: AzureConnection): Promise<AzureDevOpsCredential> {
    if (connection.credentialType === 'ENTRA') {
      try {
        return bearerCredential(await this.microsoftTokens.acquireToken(connection.employeeId, AZURE_DEVOPS_SCOPES));
      } catch (error) {
        if (error instanceof MicrosoftReauthRequiredError) throw new AzureCredentialUnavailableError('EXPIRED');
        throw error;
      }
    }

    if (!connection.encryptedPat) throw new AzureCredentialUnavailableError('MISSING');
    // Azure DevOps keeps working until the real expiry, but the employee told us this date: don't send a dead token.
    if (connection.patExpiresAt && Date.parse(connection.patExpiresAt) <= Date.now()) throw new AzureCredentialUnavailableError('EXPIRED');
    const pat = this.crypto.openProviderToken(connection.encryptedPat);
    if (!pat) throw new AzureCredentialUnavailableError('UNREADABLE');
    return patCredential(pat);
  }
}
