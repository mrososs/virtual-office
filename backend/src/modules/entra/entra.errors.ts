import type { SignInErrorCode } from '@virtual-office/shared';

/** A sign-in / consent round trip that must end on a friendly error page, not a stack trace. */
export class EntraFlowError extends Error {
  constructor(
    readonly code: SignInErrorCode,
    detail: string,
  ) {
    super(detail);
    this.name = 'EntraFlowError';
  }
}

/**
 * The stored refresh token can no longer mint a token for the requested
 * scopes (never consented, consent revoked, password reset, expired…): the
 * employee has to go through Microsoft interactively again.
 */
export class MicrosoftReauthRequiredError extends Error {
  constructor(readonly reason: string) {
    super(`Microsoft re-authentication required (${reason})`);
    this.name = 'MicrosoftReauthRequiredError';
  }
}
