import { Injectable, Logger } from '@nestjs/common';
import { InteractionRequiredAuthError } from '@azure/msal-node';
import type { UUID } from '@virtual-office/shared';
import { CryptoService } from '../../common/security/crypto.service';
import { EntraClientFactory } from './entra-client.factory';
import { MicrosoftReauthRequiredError } from './entra.errors';
import { MicrosoftTokenCacheRepository } from './microsoft-token-cache.repository';

/**
 * Delegated Microsoft tokens on behalf of an employee, entirely server-side.
 * Each employee's MSAL cache (refresh token included) is stored encrypted in
 * `microsoft_token_caches`; access tokens are minted silently from it when a
 * backend feature needs one (Azure DevOps today, Graph later) and are never
 * returned to the browser.
 */
@Injectable()
export class MicrosoftTokenService {
  private readonly logger = new Logger(MicrosoftTokenService.name);
  /** Serializes cache read-modify-write per employee (a request and the scheduled sync may overlap). */
  private readonly locks = new Map<UUID, Promise<unknown>>();

  constructor(
    private readonly clients: EntraClientFactory,
    private readonly cacheRepository: MicrosoftTokenCacheRepository,
    private readonly crypto: CryptoService,
  ) {}

  /** Stores the cache produced by a sign-in or consent round trip (replacing the previous one). */
  async storeCache(employeeId: UUID, homeAccountId: string, serializedCache: string): Promise<void> {
    await this.withLock(employeeId, () =>
      this.cacheRepository.save(employeeId, { homeAccountId, encryptedCache: this.crypto.sealProviderToken(serializedCache) }),
    );
  }

  async hasCache(employeeId: UUID): Promise<boolean> {
    return (await this.cacheRepository.find(employeeId)) !== null;
  }

  /**
   * An access token for `scopes`, refreshed silently when needed.
   * @throws MicrosoftReauthRequiredError when only an interactive round trip can fix it.
   */
  acquireToken(employeeId: UUID, scopes: string[]): Promise<string> {
    return this.withLock(employeeId, async () => {
      const stored = await this.cacheRepository.find(employeeId);
      if (!stored) throw new MicrosoftReauthRequiredError('no_token_cache');
      const serialized = this.crypto.openProviderToken(stored.encryptedCache);
      if (!serialized) throw new MicrosoftReauthRequiredError('token_cache_unreadable');

      const client = this.clients.create();
      const cache = client.getTokenCache();
      cache.deserialize(serialized);
      const account = await cache.getAccountByHomeId(stored.homeAccountId);
      if (!account) throw new MicrosoftReauthRequiredError('account_missing_from_cache');

      let accessToken: string;
      try {
        const result = await client.acquireTokenSilent({ account, scopes });
        if (!result?.accessToken) throw new MicrosoftReauthRequiredError('empty_token_response');
        accessToken = result.accessToken;
      } catch (error) {
        if (error instanceof InteractionRequiredAuthError) {
          this.logger.warn(`Silent token for employee ${employeeId} needs interaction: ${error.errorCode}`);
          throw new MicrosoftReauthRequiredError(error.errorCode || 'interaction_required');
        }
        throw error;
      }

      // Refresh tokens rotate on use: persist the cache whenever MSAL changed it.
      const updated = cache.serialize();
      if (updated !== serialized) {
        await this.cacheRepository.save(employeeId, { homeAccountId: stored.homeAccountId, encryptedCache: this.crypto.sealProviderToken(updated) });
      }
      return accessToken;
    });
  }

  private withLock<T>(employeeId: UUID, task: () => Promise<T>): Promise<T> {
    const previous = this.locks.get(employeeId) ?? Promise.resolve();
    const next = previous.catch(() => undefined).then(task);
    const tail = next.catch(() => undefined);
    this.locks.set(employeeId, tail);
    void tail.then(() => {
      if (this.locks.get(employeeId) === tail) this.locks.delete(employeeId);
    });
    return next;
  }
}
