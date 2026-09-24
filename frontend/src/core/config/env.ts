/**
 * Single point of access for build-time environment variables.
 * Never read `import.meta.env` directly outside this module — that keeps
 * every runtime config value typed, documented, and easy to stub in tests.
 */
export interface RuntimeEnv {
  apiBaseUrl: string;
  socketUrl: string;
  azureDevOpsRedirectUri?: string;
  microsoftRedirectUri?: string;
  /** Seeds demo data and signs in a demo identity. Only ever enabled via VITE_DEMO_MODE=true. */
  demoMode: boolean;
}

export const runtimeEnv: RuntimeEnv = {
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3001/api',
  socketUrl: import.meta.env.VITE_SOCKET_URL ?? 'http://localhost:3001',
  azureDevOpsRedirectUri: import.meta.env.VITE_AZURE_DEVOPS_REDIRECT_URI,
  microsoftRedirectUri: import.meta.env.VITE_MICROSOFT_REDIRECT_URI,
  demoMode: import.meta.env.VITE_DEMO_MODE === 'true',
};
