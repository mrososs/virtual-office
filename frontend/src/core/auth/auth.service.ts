import type { AuthConfigResponse, AuthMeResponse, AzurePatLoginRequest } from '@virtual-office/shared';

import { ApiError, apiUrl, httpClient } from '@/core/api';

import type { SessionLookup } from './auth.types';

/**
 * Thin client for the backend-for-frontend auth endpoints. Whatever the sign-in
 * method (Azure DevOps PAT today, Microsoft later), the backend verifies it and
 * answers with an HttpOnly session cookie — this module never stores a
 * credential, and a submitted PAT is not kept after the request.
 */
export const authService = {
  /** Distinguishes "not signed in" from "can't tell right now" so the UI never loops. */
  async fetchSession(): Promise<SessionLookup> {
    try {
      return { status: 'authenticated', me: await httpClient.get<AuthMeResponse>('/auth/me') };
    } catch (error) {
      if (error instanceof ApiError) {
        if (error.status === 401) return { status: 'anonymous' };
        if (error.isNetworkError || error.status === 502 || error.status === 504) return { status: 'unavailable', problem: 'backend_unreachable' };
        if (error.status === 503) return { status: 'unavailable', problem: 'database_unavailable' };
      }
      return { status: 'unavailable', problem: 'error' };
    }
  },

  /** Which sign-in this server uses (public). Null when the server can't be reached. */
  async fetchConfig(): Promise<AuthConfigResponse | null> {
    try {
      return await httpClient.get<AuthConfigResponse>('/auth/config');
    } catch {
      return null;
    }
  },

  /** Work email + Azure DevOps PAT → session cookie. Throws `ApiError` with a `code` on refusal. */
  loginWithAzurePat(request: AzurePatLoginRequest): Promise<AuthMeResponse> {
    return httpClient.post<AuthMeResponse>('/auth/azure-pat/login', request);
  },

  /** Future Microsoft Entra mode: full-page navigation; the backend returns to `returnTo` afterwards. */
  microsoftSignInUrl(returnTo: string): string {
    return apiUrl(`/auth/microsoft/login?returnTo=${encodeURIComponent(returnTo)}`);
  },

  async logout(): Promise<void> {
    await httpClient.post<void>('/auth/logout');
  },
};
