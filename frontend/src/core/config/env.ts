/**
 * Single point of access for build-time environment variables.
 * Never read `import.meta.env` directly outside this module — that keeps
 * every runtime config value typed, documented, and easy to stub in tests.
 * Only public configuration exists here: authentication happens in the
 * backend, so the bundle holds no client ids, secrets or provider URLs.
 */
export interface RuntimeEnv {
  /** Same-origin `/api` by default (proxied to NestJS). */
  apiBaseUrl: string;
  /** Socket.IO endpoint; `undefined` = the app's own origin. */
  socketUrl: string | undefined;
  /** Seeds demo data and signs in a demo identity. Only ever enabled via VITE_DEMO_MODE=true. */
  demoMode: boolean;
}

export const runtimeEnv: RuntimeEnv = {
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL || '/api',
  socketUrl: import.meta.env.VITE_SOCKET_URL || undefined,
  demoMode: import.meta.env.VITE_DEMO_MODE === 'true',
};
