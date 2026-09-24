import type { UUID } from '@virtual-office/shared';

import { runtimeEnv } from '@/core/config';
import { socketClient } from '@/core/socket';
import { useAuthStore } from '@/stores/auth.store';

import { DEMO_IDENTITY_ALIASES, DEMO_ORGANIZATION_ID, EMP } from './demo.ids';
import { DEMO_IDENTITIES, type DemoIdentity } from './employees.demo';

const IDENTITY_STORAGE_KEY = 'vo:demo-identity';
const IDENTITY_QUERY_PARAM = 'demoUser';
const REALTIME_TOKEN_TIMEOUT_MS = 2500;

/**
 * DemoSessionService — the ONLY place demo authentication happens.
 *
 * Active only when VITE_DEMO_MODE=true (bootstrap checks before importing
 * this module). It signs the tab in as a demo employee without credentials
 * and asks the backend's isolated demo endpoint (DEMO_MODE=true, never in
 * production) for a realtime token. Production auth — the router guard,
 * `authStore.login`, the backend JwtAuthGuard — is untouched.
 *
 * Identity is per tab: `?demoUser=ahmed` (or an employee id) picks who you
 * are, and sessionStorage keeps it across reloads of that tab only.
 */
class DemoSessionService {
  private realtimeToken: Promise<string | null> | null = null;

  readonly identities: readonly DemoIdentity[] = DEMO_IDENTITIES;

  start(): DemoIdentity {
    const identity = this.resolveIdentity();
    useAuthStore().startDemoSession({
      employeeId: identity.employeeId,
      organizationId: DEMO_ORGANIZATION_ID,
      displayName: identity.displayName,
      email: `${identity.employeeId}@demo.local`,
    });
    this.realtimeToken = this.requestRealtimeToken(identity.employeeId);
    return identity;
  }

  /** Resolves to a backend-issued JWT, or null when the backend (or its demo mode) is unavailable. */
  async ensureRealtimeToken(): Promise<string | null> {
    const token = await (this.realtimeToken ?? Promise.resolve(null));
    useAuthStore().setRealtimeToken(token);
    socketClient.setAuthToken(token);
    return token;
  }

  /** URL that opens the office as someone else in a new tab (for multiplayer testing). */
  urlForIdentity(employeeId: UUID): string {
    const url = new URL(window.location.href);
    url.pathname = '/office';
    url.search = '';
    url.searchParams.set(IDENTITY_QUERY_PARAM, employeeId);
    return url.toString();
  }

  private resolveIdentity(): DemoIdentity {
    const url = new URL(window.location.href);
    const requested = url.searchParams.get(IDENTITY_QUERY_PARAM)?.toLowerCase() ?? null;
    const stored = safeSessionGet(IDENTITY_STORAGE_KEY);
    const candidate = requested ? (DEMO_IDENTITY_ALIASES[requested] ?? requested) : stored;
    const identity = this.identities.find((item) => item.employeeId === candidate) ?? this.defaultIdentity();
    safeSessionSet(IDENTITY_STORAGE_KEY, identity.employeeId);
    return identity;
  }

  private defaultIdentity(): DemoIdentity {
    return this.identities.find((item) => item.employeeId === EMP.mohamed) ?? (this.identities[0] as DemoIdentity);
  }

  private async requestRealtimeToken(employeeId: UUID): Promise<string | null> {
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), REALTIME_TOKEN_TIMEOUT_MS);
    try {
      const response = await fetch(`${runtimeEnv.apiBaseUrl}/demo/session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employeeId, organizationId: DEMO_ORGANIZATION_ID }),
        signal: controller.signal,
      });
      if (!response.ok) return null;
      const body = (await response.json()) as { accessToken?: string };
      return body.accessToken ?? null;
    } catch {
      return null;
    } finally {
      window.clearTimeout(timer);
    }
  }
}

function safeSessionGet(key: string): string | null {
  try {
    return window.sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSessionSet(key: string, value: string): void {
  try {
    window.sessionStorage.setItem(key, value);
  } catch {
    // Storage can be unavailable (privacy mode); identity still works for this page load.
  }
}

export const demoSessionService = new DemoSessionService();
