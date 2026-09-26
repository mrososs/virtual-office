import type { AzurePatErrorCode, SignInErrorCode } from '@virtual-office/shared';

import { ApiError } from '@/core/api';
import type { SessionProblem } from '@/core/auth';

export interface SignInNotice {
  tone: 'info' | 'warning' | 'danger';
  title: string;
  body?: string;
}

/** `/login?error=<code>` (set by the backend callback) → something a person can act on. */
const ERROR_NOTICES: Record<SignInErrorCode, SignInNotice> = {
  not_authorized: {
    tone: 'danger',
    title: 'Your account is not authorized to access iSaned Virtual Office.',
    body: 'Only approved iSaned team members can sign in. If you should have access, ask your team lead to add your work email.',
  },
  account_disabled: {
    tone: 'danger',
    title: 'Your Virtual Office access is disabled.',
    body: 'Contact your team lead if you think this is a mistake.',
  },
  wrong_tenant: {
    tone: 'warning',
    title: 'That Microsoft account belongs to another organization.',
    body: 'Sign in with your iSaned work account.',
  },
  cancelled: { tone: 'info', title: 'Sign-in was cancelled.', body: 'You can try again whenever you are ready.' },
  login_expired: { tone: 'warning', title: 'Your sign-in was interrupted or took too long.', body: 'Please sign in again.' },
  consent_required: {
    tone: 'warning',
    title: 'iSaned Virtual Office needs approval from your organization.',
    body: 'An iSaned Microsoft Entra administrator must grant consent for the app before you can sign in.',
  },
  not_configured: {
    tone: 'warning',
    title: 'Microsoft sign-in is not configured on this server yet.',
    body: 'An administrator needs to set the Entra app registration (see docs/MICROSOFT_AUTH_SETUP.md).',
  },
  service_unavailable: {
    tone: 'warning',
    title: 'Microsoft or the Virtual Office server is temporarily unavailable.',
    body: 'Try again in a moment.',
  },
  login_failed: { tone: 'danger', title: 'Sign-in failed.', body: 'Please try again. If it keeps happening, tell your team lead.' },
};

const PROBLEM_NOTICES: Record<SessionProblem, SignInNotice> = {
  backend_unreachable: {
    tone: 'warning',
    title: "Can't reach the Virtual Office.",
    body: "You're offline or the server is down. Nothing is lost — retry once the connection is back.",
  },
  database_unavailable: { tone: 'warning', title: 'The Virtual Office is temporarily unavailable.', body: 'Its database is not responding. Try again shortly.' },
  error: { tone: 'danger', title: 'Something went wrong while checking your session.', body: 'Retry, or sign in again.' },
};

export function signInErrorNotice(code: unknown): SignInNotice | null {
  return typeof code === 'string' && code in ERROR_NOTICES ? ERROR_NOTICES[code as SignInErrorCode] : null;
}

export function sessionProblemNotice(problem: SessionProblem | null): SignInNotice | null {
  return problem ? PROBLEM_NOTICES[problem] : null;
}

export const SIGNED_OUT_NOTICE: SignInNotice = { tone: 'info', title: 'You are signed out.' };
export const SESSION_ENDED_NOTICE: SignInNotice = { tone: 'info', title: 'Your session ended.', body: 'Sign in again to return to the office.' };

/** Refusals of an Azure DevOps token sign-in / update (`message.code` from the API). */
const AZURE_PAT_NOTICES: Record<AzurePatErrorCode | 'invalid_expiry', SignInNotice> = {
  invalid_token: {
    tone: 'danger',
    title: "Azure DevOps didn't accept that token.",
    body: 'It may be mistyped, expired or revoked. Create a new token and try again.',
  },
  email_mismatch: {
    tone: 'warning',
    title: 'That token belongs to a different Azure DevOps account.',
    body: 'Use a token you created yourself, signed in to Azure DevOps with this work email.',
  },
  identity_unverifiable: {
    tone: 'warning',
    title: "Azure DevOps didn't confirm a work email for this token.",
    body: 'Create the token while signed in with your iSaned work account.',
  },
  not_authorized: {
    tone: 'danger',
    title: 'Your account is not authorized to access iSaned Virtual Office.',
    body: 'Only approved iSaned team members can sign in. Ask your team lead to add your work email.',
  },
  account_disabled: { tone: 'danger', title: 'Your Virtual Office access is disabled.', body: 'Contact your team lead if you think this is a mistake.' },
  rate_limited: { tone: 'warning', title: 'Too many attempts.', body: 'Wait a few minutes and try again.' },
  not_configured: {
    tone: 'warning',
    title: 'Azure DevOps sign-in is not configured on this server yet.',
    body: 'An administrator needs to set AZURE_DEVOPS_ORGANIZATION (see docs/AZURE_PAT_AUTH.md).',
  },
  service_unavailable: { tone: 'warning', title: 'Azure DevOps or the Virtual Office server is unavailable.', body: 'Try again in a moment.' },
  invalid_expiry: { tone: 'warning', title: 'That expiry date is already in the past.', body: 'Pick the date your token expires, or leave it empty.' },
};

export function azurePatErrorNotice(code: string | null): SignInNotice {
  return (code && AZURE_PAT_NOTICES[code as keyof typeof AZURE_PAT_NOTICES]) || {
    tone: 'danger',
    title: 'Something went wrong.',
    body: 'Please try again. If it keeps happening, tell your team lead.',
  };
}

/** Any failed token request (sign-in or update) → the notice to show. */
export function tokenRequestNotice(error: unknown): SignInNotice {
  if (error instanceof ApiError) {
    if (error.isNetworkError) return azurePatErrorNotice('service_unavailable');
    if (error.code) return azurePatErrorNotice(error.code);
    // Validation errors arrive as `{ message: { message: string[] } }` from the API's error filter.
    const outer = (error.body as { message?: unknown } | undefined)?.message;
    const messages = Array.isArray(outer) ? outer : (outer as { message?: unknown } | undefined)?.message;
    if (error.status === 400 && Array.isArray(messages) && typeof messages[0] === 'string') {
      return { tone: 'warning', title: 'Check the details and try again.', body: messages[0] };
    }
  }
  return azurePatErrorNotice(null);
}
