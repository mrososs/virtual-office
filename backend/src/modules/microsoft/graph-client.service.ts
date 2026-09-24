import { Injectable } from '@nestjs/common';
import { MicrosoftAuthService } from './microsoft-auth.service';

/**
 * Thin wrapper around calls to Microsoft Graph (`https://graph.microsoft.com`).
 * Every microsoft/* service should go through this rather than constructing
 * its own HTTP client, so auth headers and base URL handling live in one
 * place.
 */
@Injectable()
export class GraphClientService {
  private readonly baseUrl = 'https://graph.microsoft.com/v1.0';

  constructor(private readonly microsoftAuthService: MicrosoftAuthService) {}

  async get<T>(path: string): Promise<T> {
    // TODO: fetch(`${this.baseUrl}${path}`, { headers: { Authorization: `Bearer ${token}` } })
    const token = await this.microsoftAuthService.getAccessToken();
    void token;
    void path;
    void this.baseUrl;
    throw new Error('Not implemented');
  }
}
