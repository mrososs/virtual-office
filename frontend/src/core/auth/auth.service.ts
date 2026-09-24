import { httpClient } from '@/core/api';

import type { AuthSession, LoginCredentials } from './auth.types';

/**
 * Thin service around the backend auth endpoints. Session persistence and
 * reactive current-user state live in `stores/auth.store.ts`; this module
 * only knows how to talk to the API.
 */
export const authService = {
  async login(credentials: LoginCredentials): Promise<AuthSession> {
    // TODO: call backend once the auth module is implemented.
    return httpClient.post<AuthSession>('/auth/login', credentials);
  },

  async logout(): Promise<void> {
    // TODO: call backend once the auth module is implemented.
    await httpClient.post<void>('/auth/logout');
  },

  async fetchSession(): Promise<AuthSession | null> {
    // TODO: call backend once the auth module is implemented.
    try {
      return await httpClient.get<AuthSession>('/auth/session');
    } catch {
      return null;
    }
  },
};
