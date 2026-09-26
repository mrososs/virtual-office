import { Injectable } from '@nestjs/common';
import type { UUID } from '@virtual-office/shared';
import { GRAPH_CALENDAR_SCOPES } from '../entra/entra-scopes';
import { MicrosoftTokenService } from '../entra/microsoft-token.service';

/**
 * Thin wrapper around Microsoft Graph (`https://graph.microsoft.com`), called
 * on behalf of one employee with a delegated token from the same Entra sign-in
 * architecture as Azure DevOps (no app-only permissions). Not wired to any
 * feature yet: calendar/Teams sync is the next phase, and its scopes are only
 * requested once that ships (incremental consent).
 */
@Injectable()
export class GraphClientService {
  private readonly baseUrl = 'https://graph.microsoft.com/v1.0';

  constructor(private readonly tokens: MicrosoftTokenService) {}

  async get<T>(employeeId: UUID, path: string, scopes: string[] = GRAPH_CALENDAR_SCOPES): Promise<T> {
    const token = await this.tokens.acquireToken(employeeId, scopes);
    const response = await fetch(`${this.baseUrl}${path}`, {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
      signal: AbortSignal.timeout(15_000),
    });
    if (!response.ok) throw new Error(`Microsoft Graph ${path} answered ${response.status}`);
    return (await response.json()) as T;
  }
}
