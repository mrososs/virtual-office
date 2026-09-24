import type { UUID } from '@virtual-office/shared';
import { defineStore } from 'pinia';

import { authService } from '@/core/auth';
import type { CurrentUser } from '@/core/auth';

interface AuthStoreState {
  currentUser: CurrentUser | null;
  token: string | null;
  /** True when the session came from DemoSessionService rather than a real login. */
  isDemoSession: boolean;
  /** Backend-issued JWT for Socket.IO; null when realtime is unavailable. */
  realtimeToken: string | null;
  isAuthenticating: boolean;
}

export const useAuthStore = defineStore('auth', {
  state: (): AuthStoreState => ({
    currentUser: null,
    token: null,
    isDemoSession: false,
    realtimeToken: null,
    isAuthenticating: false,
  }),

  getters: {
    isAuthenticated: (state): boolean => state.token !== null && state.currentUser !== null,
    currentEmployeeId: (state): UUID | null => state.currentUser?.employeeId ?? null,
  },

  actions: {
    async login(email: string, password: string): Promise<void> {
      this.isAuthenticating = true;
      try {
        const session = await authService.login({ email, password });
        this.token = session.token;
        this.realtimeToken = session.token;
        this.isDemoSession = false;
        this.currentUser = {
          employeeId: session.employee.id,
          organizationId: session.employee.organizationId,
          displayName: session.employee.displayName,
          email,
        };
      } finally {
        this.isAuthenticating = false;
      }
    },

    /** Only called by `demo/demo-session.service.ts` when VITE_DEMO_MODE=true. */
    startDemoSession(user: CurrentUser): void {
      this.currentUser = user;
      this.token = 'demo-session';
      this.isDemoSession = true;
    },

    setRealtimeToken(token: string | null): void {
      this.realtimeToken = token;
    },

    async logout(): Promise<void> {
      if (!this.isDemoSession) {
        await authService.logout();
      }
      this.token = null;
      this.realtimeToken = null;
      this.currentUser = null;
      this.isDemoSession = false;
    },
  },
});
