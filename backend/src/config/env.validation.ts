import { plainToInstance } from 'class-transformer';
import { IsIn, IsNumberString, IsOptional, Matches, validateSync } from 'class-validator';

const GUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Declarative shape of everything we read from `process.env`. Everything is
 * optional here so local development (demo mode) boots with nothing set;
 * `assertProductionReady` below turns the production essentials into hard
 * requirements.
 */
class EnvironmentVariables {
  @IsOptional()
  @IsNumberString()
  PORT?: string;

  @IsOptional()
  @IsNumberString()
  TRUST_PROXY_HOPS?: string;

  @IsOptional()
  @IsIn(['development', 'production', 'test'])
  NODE_ENV?: string;

  @IsOptional()
  APP_URL?: string;

  @IsOptional()
  @IsIn(['true', 'false'])
  DEMO_MODE?: string;

  @IsOptional()
  @IsIn(['azure_pat', 'microsoft_entra', 'demo'])
  AUTH_PROVIDER?: string;

  @IsOptional()
  JWT_SECRET?: string;

  @IsOptional()
  JWT_EXPIRES_IN?: string;

  @IsOptional()
  SESSION_SECRET?: string;

  @IsOptional()
  @IsNumberString()
  SESSION_IDLE_TIMEOUT_HOURS?: string;

  @IsOptional()
  @IsNumberString()
  SESSION_ABSOLUTE_TIMEOUT_DAYS?: string;

  @IsOptional()
  TOKEN_ENCRYPTION_KEY?: string;

  @IsOptional()
  ORGANIZATION_NAME?: string;

  @IsOptional()
  SUPABASE_URL?: string;

  @IsOptional()
  SUPABASE_SERVICE_ROLE_KEY?: string;

  // Single-tenant only: a tenant GUID, never `common` / `organizations` / `consumers`.
  @IsOptional()
  @Matches(GUID, { message: 'ENTRA_TENANT_ID must be the iSaned tenant GUID (not common/organizations/consumers)' })
  ENTRA_TENANT_ID?: string;

  @IsOptional()
  @Matches(GUID, { message: 'ENTRA_CLIENT_ID must be the app registration (client) GUID' })
  ENTRA_CLIENT_ID?: string;

  @IsOptional()
  ENTRA_CLIENT_SECRET?: string;

  @IsOptional()
  ENTRA_REDIRECT_URI?: string;

  @IsOptional()
  ENTRA_AUTHORITY_HOST?: string;

  @IsOptional()
  AZURE_DEVOPS_ORGANIZATION?: string;

  @IsOptional()
  AZURE_DEVOPS_PROJECT?: string;

  @IsOptional()
  AZURE_DEVOPS_TEAM?: string;

  @IsOptional()
  @IsNumberString()
  AZURE_DEVOPS_SYNC_INTERVAL_SECONDS?: string;

  @IsOptional()
  AZURE_DEVOPS_WEBHOOK_SECRET?: string;
}

/** What each sign-in mode needs, in every environment where that mode is active. */
const PROVIDER_REQUIREMENTS: Record<string, Array<keyof EnvironmentVariables>> = {
  azure_pat: ['AZURE_DEVOPS_ORGANIZATION'],
  microsoft_entra: ['ENTRA_TENANT_ID', 'ENTRA_CLIENT_ID', 'ENTRA_CLIENT_SECRET', 'ENTRA_REDIRECT_URI'],
  demo: [],
};

/**
 * Fails the boot of a production process that is missing (or misusing) a
 * security-critical setting. Microsoft Entra values are only required when
 * AUTH_PROVIDER=microsoft_entra — the default `azure_pat` mode needs none.
 */
function assertProductionReady(env: EnvironmentVariables): string[] {
  if (env.NODE_ENV !== 'production') return [];
  const provider = env.AUTH_PROVIDER ?? 'azure_pat';
  const problems: string[] = [];
  const required: Array<keyof EnvironmentVariables> = [
    'APP_URL',
    'SESSION_SECRET',
    'TOKEN_ENCRYPTION_KEY',
    'SUPABASE_URL',
    'SUPABASE_SERVICE_ROLE_KEY',
    ...(PROVIDER_REQUIREMENTS[provider] ?? []),
  ];
  for (const key of required) {
    if (!env[key]) problems.push(`${key} is required in production (AUTH_PROVIDER=${provider})`);
  }
  if (provider === 'demo') problems.push('AUTH_PROVIDER=demo is not allowed in production');
  if (env.DEMO_MODE === 'true') problems.push('DEMO_MODE must not be true in production');
  if (env.APP_URL && !env.APP_URL.startsWith('https://')) problems.push('APP_URL must use https:// in production');
  if (provider === 'microsoft_entra' && env.ENTRA_REDIRECT_URI && !env.ENTRA_REDIRECT_URI.startsWith('https://')) {
    problems.push('ENTRA_REDIRECT_URI must use https:// in production');
  }
  return problems;
}

/** Key-shape checks that apply in every environment once a value is present. */
function assertSecretShapes(env: EnvironmentVariables): string[] {
  const problems: string[] = [];
  if (env.SESSION_SECRET && env.SESSION_SECRET.length < 32) problems.push('SESSION_SECRET must be at least 32 characters');
  if (env.TOKEN_ENCRYPTION_KEY && Buffer.from(env.TOKEN_ENCRYPTION_KEY, 'base64').length !== 32) {
    problems.push('TOKEN_ENCRYPTION_KEY must be 32 random bytes, base64-encoded');
  }
  return problems;
}

/**
 * Validation function wired into `ConfigModule.forRoot({ validate })`.
 * Throws on bootstrap if env vars are missing/malformed rather than failing
 * later, deep inside a request handler.
 */
export function validate(config: Record<string, unknown>): EnvironmentVariables {
  // `KEY=` in a .env file means "not set", not "set to an empty string".
  const present = Object.fromEntries(Object.entries(config).filter(([, value]) => !(typeof value === 'string' && value.trim() === '')));
  const validatedConfig = plainToInstance(EnvironmentVariables, present, {
    enableImplicitConversion: true,
  });

  const errors = validateSync(validatedConfig, { skipMissingProperties: false });
  const problems = [
    ...errors.flatMap((error) => Object.values(error.constraints ?? {})),
    ...assertSecretShapes(validatedConfig),
    ...assertProductionReady(validatedConfig),
  ];

  if (problems.length > 0) {
    throw new Error(`Invalid environment configuration:\n - ${problems.join('\n - ')}`);
  }

  return validatedConfig;
}
