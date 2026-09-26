import type { AuthProviderId } from '@virtual-office/shared';

/**
 * Typed configuration factory consumed via `ConfigModule.forRoot({ load: [configuration] })`.
 * Every other module should read config through `ConfigService.get<AppConfig>(...)`
 * rather than touching `process.env` directly, so we have exactly one place
 * that knows the shape of our environment.
 */
export interface AppConfig {
  port: number;
  nodeEnv: string;
  isProduction: boolean;
  /**
   * Reverse proxies in front of the API in production (TRUST_PROXY_HOPS, default 1). Railway alone = 1;
   * Vercel rewriting /api to Railway = 2, so rate limits see the visitor's IP rather than Vercel's.
   */
  trustProxyHops: number;
  /** Public URL of the web app (APP_URL). Its origin is the only browser origin the API accepts. */
  appUrl: string;
  appOrigin: string;
  /**
   * How people sign in (AUTH_PROVIDER): `azure_pat` (default — work email + Azure DevOps PAT),
   * `microsoft_entra` (needs an IT-approved app registration), or `demo` (demo identities only).
   */
  authProvider: AuthProviderId;
  /** Enables the credential-less demo identity endpoint. Never honored when NODE_ENV=production. */
  demoMode: boolean;
  demo: {
    /** Signs demo realtime tokens only; production sessions never use JWTs. */
    tokenSecret: string;
    tokenExpiresIn: string;
  };
  session: {
    /** Keys the session-token hash and seals the short-lived sign-in state cookie. */
    secret: string;
    cookieName: string;
    flowCookieName: string;
    /** Secure + `__Host-` cookies whenever the app is served over HTTPS. */
    secureCookies: boolean;
    /** A session ends after this long without any request (sliding). */
    idleTimeoutHours: number;
    /** …and never lives longer than this, active or not. */
    absoluteTimeoutDays: number;
  };
  /** AES-256-GCM key (base64, 32 bytes) for provider tokens at rest. */
  tokenEncryptionKey: string;
  /** The one team this deployment serves. Not a tenant model — just labels and stable ids. */
  organization: {
    id: string;
    name: string;
    officeId: string;
    floorId: string;
  };
  supabase: {
    url: string;
    serviceRoleKey: string;
  };
  entra: {
    tenantId: string;
    clientId: string;
    clientSecret: string;
    redirectUri: string;
    /** https://login.microsoftonline.com unless a national cloud is used. */
    authorityHost: string;
  };
  azureDevOps: {
    organization: string;
    project: string;
    /** Empty = the project's default team. */
    team: string;
    syncIntervalSeconds: number;
    webhookSecret: string;
  };
}

export const AUTH_PROVIDERS: readonly AuthProviderId[] = ['azure_pat', 'microsoft_entra', 'demo'];

export function resolveAuthProvider(env: NodeJS.ProcessEnv): AuthProviderId {
  const value = env.AUTH_PROVIDER?.trim();
  return (AUTH_PROVIDERS as readonly string[]).includes(value ?? '') ? (value as AuthProviderId) : 'azure_pat';
}

/** Demo identities: DEMO_MODE=true (alongside a real provider) or AUTH_PROVIDER=demo — never in production. */
export function isDemoModeEnabled(env: NodeJS.ProcessEnv): boolean {
  return (env.DEMO_MODE === 'true' || env.AUTH_PROVIDER?.trim() === 'demo') && env.NODE_ENV !== 'production';
}

/** An env var, with blank values (`KEY=` in .env) treated as unset. */
function read(name: string): string | undefined {
  const value = process.env[name]?.trim();
  return value ? value : undefined;
}

function originOf(url: string): string {
  try {
    return new URL(url).origin;
  } catch {
    return url;
  }
}

function positiveInt(value: string | undefined, fallback: number, min = 1): number {
  const parsed = Number.parseInt(value ?? '', 10);
  return Number.isFinite(parsed) && parsed >= min ? parsed : fallback;
}

export default (): { app: AppConfig } => {
  const nodeEnv = read('NODE_ENV') ?? 'development';
  const appUrl = (read('APP_URL') ?? 'http://localhost:5173').replace(/\/+$/, '');
  const secureCookies = appUrl.startsWith('https://');

  return {
    app: {
      port: parseInt(read('PORT') ?? '3001', 10),
      nodeEnv,
      isProduction: nodeEnv === 'production',
      trustProxyHops: parseInt(read('TRUST_PROXY_HOPS') ?? '1', 10),
      appUrl,
      appOrigin: originOf(appUrl),
      authProvider: resolveAuthProvider(process.env),
      demoMode: isDemoModeEnabled(process.env),
      demo: {
        tokenSecret: read('JWT_SECRET') ?? '',
        tokenExpiresIn: read('JWT_EXPIRES_IN') ?? '1d',
      },
      session: {
        secret: read('SESSION_SECRET') ?? '',
        // `__Host-` pins the cookie to this exact host, HTTPS and path "/".
        cookieName: secureCookies ? '__Host-vo_session' : 'vo_session',
        flowCookieName: secureCookies ? '__Host-vo_signin' : 'vo_signin',
        secureCookies,
        // 14 days idle: signing in again means creating a new PAT (Azure shows it once), so a normal
        // holiday must not log people out. The 30-day cap matches Azure DevOps' default PAT lifetime.
        idleTimeoutHours: positiveInt(read('SESSION_IDLE_TIMEOUT_HOURS'), 14 * 24),
        absoluteTimeoutDays: positiveInt(read('SESSION_ABSOLUTE_TIMEOUT_DAYS'), 30),
      },
      tokenEncryptionKey: read('TOKEN_ENCRYPTION_KEY') ?? '',
      organization: {
        id: 'isaned',
        name: read('ORGANIZATION_NAME') ?? 'iSaned',
        officeId: 'isaned-hq',
        floorId: 'isaned-hq-floor-1',
      },
      supabase: {
        url: read('SUPABASE_URL') ?? '',
        serviceRoleKey: read('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      },
      entra: {
        tenantId: read('ENTRA_TENANT_ID') ?? '',
        clientId: read('ENTRA_CLIENT_ID') ?? '',
        clientSecret: read('ENTRA_CLIENT_SECRET') ?? '',
        redirectUri: read('ENTRA_REDIRECT_URI') ?? `${appUrl}/api/auth/microsoft/callback`,
        authorityHost: (read('ENTRA_AUTHORITY_HOST') ?? 'https://login.microsoftonline.com').replace(/\/+$/, ''),
      },
      azureDevOps: {
        organization: read('AZURE_DEVOPS_ORGANIZATION') ?? '',
        project: read('AZURE_DEVOPS_PROJECT') ?? '',
        team: read('AZURE_DEVOPS_TEAM') ?? '',
        syncIntervalSeconds: positiveInt(read('AZURE_DEVOPS_SYNC_INTERVAL_SECONDS'), 120, 60),
        webhookSecret: read('AZURE_DEVOPS_WEBHOOK_SECRET') ?? '',
      },
    },
  };
};
