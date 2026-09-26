import type { AuthMeResponse, AuthProviderId, AzureDevOpsConnectionStatus, UUID } from '@virtual-office/shared';
import { defineStore } from 'pinia';

import { authService } from '@/core/auth';
import type { CurrentUser, SessionProblem } from '@/core/auth';

type SessionStatus = 'unknown' | 'authenticated' | 'anonymous' | 'unavailable';

interface AuthStoreState {
  currentUser: CurrentUser | null;
  status: SessionStatus;
  /** Set when status is 'unavailable'. */
  problem: SessionProblem | null;
  sessionExpiresAt: string | null;
  /** True when the session came from DemoSessionService rather than a real sign-in. */
  isDemoSession: boolean;
  /** Demo mode only: backend-issued demo token for Socket.IO (production sockets use the session cookie). */
  realtimeToken: string | null;
  /** How this session was established (Azure DevOps PAT today). */
  provider: AuthProviderId | null;
  /** Last known state of the employee's own Azure DevOps connection — informs, never blocks. */
  azureDevOpsStatus: AzureDevOpsConnectionStatus | null;
}

/**
 * Who is signed in, as normalized by the backend (`/api/auth/me`). The session
 * itself is an HttpOnly cookie the browser manages; no Azure DevOps PAT,
 * Microsoft token or session secret is ever held here or in browser storage.
 */
export const useAuthStore = defineStore('auth', {
  state: (): AuthStoreState => ({
    currentUser: null,
    status: 'unknown',
    problem: null,
    sessionExpiresAt: null,
    isDemoSession: false,
    realtimeToken: null,
    provider: null,
    azureDevOpsStatus: null,
  }),

  getters: {
    isAuthenticated: (state): boolean => state.currentUser !== null && (state.isDemoSession || state.status === 'authenticated'),
    currentEmployeeId: (state): UUID | null => state.currentUser?.employeeId ?? null,
  },

  actions: {
    /** Asks the backend who we are. Returns the session on success. */
    async restore(): Promise<AuthMeResponse | null> {
      const lookup = await authService.fetchSession();
      if (lookup.status === 'authenticated') {
        this.setSession(lookup.me);
        return lookup.me;
      }
      this.currentUser = null;
      this.sessionExpiresAt = null;
      this.status = lookup.status;
      this.problem = lookup.status === 'unavailable' ? lookup.problem : null;
      return null;
    },

    setSession(me: AuthMeResponse): void {
      this.currentUser = {
        employeeId: me.employee.id,
        organizationId: me.organization.id,
        displayName: me.employee.displayName,
        email: me.employee.email,
        role: me.employee.role,
        jobTitle: me.employee.jobTitle,
        team: me.employee.team,
        discipline: me.employee.discipline,
      };
      this.sessionExpiresAt = me.session.expiresAt;
      this.provider = me.session.provider;
      this.azureDevOpsStatus = me.integrations.azureDevOps;
      this.status = 'authenticated';
      this.problem = null;
      this.isDemoSession = false;
    },

    /** Only called by `demo/demo-session.service.ts` when VITE_DEMO_MODE=true. */
    startDemoSession(user: CurrentUser): void {
      this.currentUser = user;
      this.status = 'authenticated';
      this.problem = null;
      this.isDemoSession = true;
    },

    setRealtimeToken(token: string | null): void {
      this.realtimeToken = token;
    },

    setAzureDevOpsStatus(status: AzureDevOpsConnectionStatus): void {
      this.azureDevOpsStatus = status;
    },

    /** Re-reads /auth/me quietly (e.g. after a sync) to pick up a changed Azure DevOps connection state. */
    async refreshIntegrations(): Promise<void> {
      if (this.isDemoSession || this.status !== 'authenticated') return;
      const lookup = await authService.fetchSession();
      if (lookup.status === 'authenticated') this.azureDevOpsStatus = lookup.me.integrations.azureDevOps;
    },

    /** Ends the server session (clearing its cookie). Callers reload to /login so no office state survives. */
    async logout(): Promise<void> {
      if (!this.isDemoSession) {
        await authService.logout().catch(() => undefined);
      }
      this.currentUser = null;
      this.realtimeToken = null;
      this.sessionExpiresAt = null;
      this.status = 'anonymous';
      this.isDemoSession = false;
    },
  },
});
