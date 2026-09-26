import { HttpException, HttpStatus } from '@nestjs/common';
import type { AzurePatErrorCode } from '@virtual-office/shared';

/**
 * A PAT sign-in / token update the employee must fix. Messages are ours and
 * safe to show; raw Azure DevOps error text never reaches the browser.
 */
export class AzurePatError extends Error {
  constructor(
    readonly code: AzurePatErrorCode,
    detail: string,
  ) {
    super(detail);
    this.name = 'AzurePatError';
  }
}

/** Human-readable, non-sensitive text for each code (the frontend has its own copy too). */
export const AZURE_PAT_ERROR_MESSAGES: Record<AzurePatErrorCode, string> = {
  invalid_token: 'Azure DevOps did not accept this token. It may be mistyped, expired or revoked.',
  email_mismatch: 'This token belongs to a different Azure DevOps account than the email entered.',
  identity_unverifiable: 'Azure DevOps did not return a verifiable work email for this token.',
  not_authorized: 'Your account is not authorized to access iSaned Virtual Office.',
  account_disabled: 'Your Virtual Office access is disabled.',
  rate_limited: 'Too many attempts. Wait a few minutes and try again.',
  not_configured: 'Azure DevOps sign-in is not configured on this server.',
  service_unavailable: 'Azure DevOps or the Virtual Office server is temporarily unavailable. Try again shortly.',
};

const HTTP_STATUS: Record<AzurePatErrorCode, HttpStatus> = {
  invalid_token: HttpStatus.UNAUTHORIZED,
  email_mismatch: HttpStatus.FORBIDDEN,
  identity_unverifiable: HttpStatus.UNPROCESSABLE_ENTITY,
  not_authorized: HttpStatus.FORBIDDEN,
  account_disabled: HttpStatus.FORBIDDEN,
  rate_limited: HttpStatus.TOO_MANY_REQUESTS,
  not_configured: HttpStatus.SERVICE_UNAVAILABLE,
  service_unavailable: HttpStatus.SERVICE_UNAVAILABLE,
};

/** Failures that say something about the submitted credential — these count towards the rate limit. */
export function isCredentialFailure(code: AzurePatErrorCode): boolean {
  return code !== 'not_configured' && code !== 'service_unavailable' && code !== 'rate_limited';
}

/** `{ statusCode, message: { code, message } }` with our own wording — never Azure's raw error. */
export function azurePatHttpException(error: AzurePatError): HttpException {
  return new HttpException({ code: error.code, message: AZURE_PAT_ERROR_MESSAGES[error.code] }, HTTP_STATUS[error.code]);
}
