import { plainToInstance } from 'class-transformer';
import { IsIn, IsNotEmpty, IsNumberString, IsOptional, validateSync } from 'class-validator';

/**
 * Declarative shape of everything we read from `process.env`. Kept
 * intentionally shallow (class-validator, no custom schema layer) so this
 * stays easy to extend as new integrations (Azure DevOps, Microsoft Graph)
 * grow real requirements.
 */
class EnvironmentVariables {
  @IsOptional()
  @IsNumberString()
  PORT?: string;

  @IsOptional()
  @IsIn(['development', 'production', 'test'])
  NODE_ENV?: string;

  @IsOptional()
  FRONTEND_ORIGIN?: string;

  @IsOptional()
  @IsIn(['true', 'false'])
  DEMO_MODE?: string;

  @IsNotEmpty()
  JWT_SECRET!: string;

  @IsOptional()
  JWT_EXPIRES_IN?: string;

  @IsOptional()
  SUPABASE_URL?: string;

  @IsOptional()
  SUPABASE_SERVICE_ROLE_KEY?: string;

  @IsOptional()
  SUPABASE_ANON_KEY?: string;

  @IsOptional()
  AZURE_DEVOPS_ORG_URL?: string;

  @IsOptional()
  AZURE_DEVOPS_PROJECT?: string;

  @IsOptional()
  AZURE_DEVOPS_PAT?: string;

  @IsOptional()
  AZURE_DEVOPS_WEBHOOK_SECRET?: string;

  @IsOptional()
  MICROSOFT_TENANT_ID?: string;

  @IsOptional()
  MICROSOFT_CLIENT_ID?: string;

  @IsOptional()
  MICROSOFT_CLIENT_SECRET?: string;

  @IsOptional()
  MICROSOFT_REDIRECT_URI?: string;
}

/**
 * Validation function wired into `ConfigModule.forRoot({ validate })`.
 * Throws on bootstrap if required env vars are missing/malformed rather
 * than failing later, deep inside a request handler.
 */
export function validate(config: Record<string, unknown>): EnvironmentVariables {
  const validatedConfig = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });

  const errors = validateSync(validatedConfig, { skipMissingProperties: false });

  if (errors.length > 0) {
    throw new Error(`Invalid environment configuration:\n${errors.toString()}`);
  }

  return validatedConfig;
}
