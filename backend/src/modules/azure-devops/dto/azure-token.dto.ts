import { IsISO8601, IsOptional, IsString, Matches, ValidateIf } from 'class-validator';

/**
 * An Azure DevOps Personal Access Token (84 characters today, older ones 52),
 * plus the optional expiry date the employee picked. Validation messages never
 * echo the value.
 */
export class AzureTokenDto {
  @IsString()
  @Matches(/^[A-Za-z0-9]{20,256}$/, { message: 'That does not look like an Azure DevOps personal access token' })
  token!: string;

  @IsOptional()
  @ValidateIf((_dto, value) => value !== null)
  @IsISO8601({ strict: true }, { message: 'Expiry must be a date (YYYY-MM-DD)' })
  expiresOn?: string | null;
}

/** Normalizes the optional expiry to the end of that day (UTC) and rejects dates already past. */
export function resolveTokenExpiry(expiresOn: string | null | undefined): string | null | 'past' {
  if (!expiresOn) return null;
  const endOfDay = new Date(`${expiresOn.slice(0, 10)}T23:59:59.000Z`);
  if (Number.isNaN(endOfDay.getTime())) return null;
  return endOfDay.getTime() < Date.now() ? 'past' : endOfDay.toISOString();
}
