/**
 * Typed configuration factory consumed via `ConfigModule.forRoot({ load: [configuration] })`.
 * Every other module should read config through `ConfigService.get<AppConfig>(...)`
 * rather than touching `process.env` directly, so we have exactly one place
 * that knows the shape of our environment.
 */
export interface AppConfig {
  port: number;
  nodeEnv: string;
  frontendOrigin: string;
  /** Enables the credential-less `/api/demo/session` endpoint. Never honored when NODE_ENV=production. */
  demoMode: boolean;
  auth: {
    jwtSecret: string;
    jwtExpiresIn: string;
  };
  supabase: {
    url: string;
    serviceRoleKey: string;
    anonKey: string;
  };
  azureDevOps: {
    orgUrl: string;
    project: string;
    personalAccessToken: string;
    webhookSecret: string;
  };
  microsoft: {
    tenantId: string;
    clientId: string;
    clientSecret: string;
    redirectUri: string;
  };
}

export function isDemoModeEnabled(env: NodeJS.ProcessEnv): boolean {
  return env.DEMO_MODE === 'true' && env.NODE_ENV !== 'production';
}

export default (): { app: AppConfig } => ({
  app: {
    port: parseInt(process.env.PORT ?? '3001', 10),
    nodeEnv: process.env.NODE_ENV ?? 'development',
    frontendOrigin: process.env.FRONTEND_ORIGIN ?? 'http://localhost:5173',
    demoMode: isDemoModeEnabled(process.env),
    auth: {
      jwtSecret: process.env.JWT_SECRET ?? '',
      jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? '1d',
    },
    supabase: {
      url: process.env.SUPABASE_URL ?? '',
      serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
      anonKey: process.env.SUPABASE_ANON_KEY ?? '',
    },
    azureDevOps: {
      orgUrl: process.env.AZURE_DEVOPS_ORG_URL ?? '',
      project: process.env.AZURE_DEVOPS_PROJECT ?? '',
      personalAccessToken: process.env.AZURE_DEVOPS_PAT ?? '',
      webhookSecret: process.env.AZURE_DEVOPS_WEBHOOK_SECRET ?? '',
    },
    microsoft: {
      tenantId: process.env.MICROSOFT_TENANT_ID ?? '',
      clientId: process.env.MICROSOFT_CLIENT_ID ?? '',
      clientSecret: process.env.MICROSOFT_CLIENT_SECRET ?? '',
      redirectUri: process.env.MICROSOFT_REDIRECT_URI ?? '',
    },
  },
});
