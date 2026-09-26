import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthError, CryptoProvider, ResponseMode } from '@azure/msal-node';
import type { UUID } from '@virtual-office/shared';
import type { CookieOptions, Request, Response } from 'express';
import { CryptoService } from '../../common/security/crypto.service';
import { AppConfig } from '../../config/configuration';
import { EntraClientFactory } from './entra-client.factory';
import { EntraFlowError } from './entra.errors';
import { AZURE_DEVOPS_SCOPES, SIGN_IN_SCOPES } from './entra-scopes';

/** Why we sent someone to Microsoft; one redirect URI serves both. */
export type EntraFlowPurpose = 'SIGN_IN' | 'CONNECT_AZURE_DEVOPS';

const FLOW_TTL_MS = 10 * 60_000;
const GUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Everything needed to finish the round trip, sealed into an HttpOnly cookie (never visible to scripts). */
interface FlowState {
  v: 1;
  purpose: EntraFlowPurpose;
  state: string;
  nonce: string;
  codeVerifier: string;
  returnTo: string;
  /** Set for incremental consent: the employee who started it (the account must match). */
  employeeId: UUID | null;
  createdAt: number;
}

/** A verified Microsoft identity from the iSaned tenant, normalized (no raw claims leave this service). */
export interface EntraIdentity {
  tenantId: UUID;
  objectId: UUID;
  /** `email`, falling back to `preferred_username` (UPN), lowercased. Only used for the first-sign-in match. */
  email: string | null;
  displayName: string | null;
}

export interface EntraFlowResult {
  purpose: EntraFlowPurpose;
  returnTo: string;
  employeeId: UUID | null;
  identity: EntraIdentity;
  /** The MSAL cache produced by the code redemption (holds the refresh token) — encrypt before storing. */
  tokenCache: { homeAccountId: string; serialized: string };
}

export interface CallbackQuery {
  code?: string;
  state?: string;
  error?: string;
  error_description?: string;
}

/**
 * OAuth 2.0 authorization code flow with PKCE against the single iSaned
 * tenant (MSAL Node confidential client). State (CSRF) and nonce (ID token
 * replay) are generated here, carried in a sealed SameSite=Lax cookie, and
 * validated on the way back — by us and again by MSAL. `response_mode=query`
 * keeps the callback a top-level GET, so the Lax cookie is sent with it.
 */
@Injectable()
export class EntraAuthCodeFlowService {
  private readonly logger = new Logger(EntraAuthCodeFlowService.name);
  private readonly pkce = new CryptoProvider();
  private readonly session: AppConfig['session'];

  constructor(
    configService: ConfigService,
    private readonly clients: EntraClientFactory,
    private readonly crypto: CryptoService,
  ) {
    this.session = configService.get<AppConfig>('app')!.session;
  }

  isConfigured(): boolean {
    return this.clients.isConfigured();
  }

  /** Builds the Microsoft authorize URL and the sealed flow cookie for the response. */
  async begin(purpose: EntraFlowPurpose, options: { returnTo?: unknown; loginHint?: string; employeeId?: UUID }): Promise<{ url: string; flowCookie: string }> {
    const { verifier, challenge } = await this.pkce.generatePkceCodes();
    const flow: FlowState = {
      v: 1,
      purpose,
      state: this.crypto.randomToken(24),
      nonce: this.crypto.randomToken(24),
      codeVerifier: verifier,
      returnTo: safeReturnTo(options.returnTo, purpose === 'SIGN_IN' ? '/office' : '/integrations'),
      employeeId: options.employeeId ?? null,
      createdAt: Date.now(),
    };

    const url = await this.clients.create().getAuthCodeUrl({
      scopes: scopesFor(purpose),
      redirectUri: this.clients.redirectUri,
      responseMode: ResponseMode.QUERY,
      state: flow.state,
      nonce: flow.nonce,
      codeChallenge: challenge,
      codeChallengeMethod: 'S256',
      // Sign-in lets people pick the right work account; consent pins the already signed-in one.
      prompt: purpose === 'SIGN_IN' ? 'select_account' : undefined,
      loginHint: options.loginHint,
    });
    return { url, flowCookie: this.crypto.sealFlowState(JSON.stringify(flow)) };
  }

  /** Redeems the code and returns the verified identity. Throws `EntraFlowError` for every failure mode. */
  async complete(query: CallbackQuery, sealedFlow: string | null): Promise<EntraFlowResult> {
    const flow = this.readFlow(sealedFlow);

    if (query.error) {
      this.logger.warn(`Microsoft returned ${query.error}: ${query.error_description ?? ''}`);
      throw new EntraFlowError(mapAuthorizeError(query.error, query.error_description), `authorize error ${query.error}`);
    }
    if (!flow) throw new EntraFlowError('login_expired', 'missing or expired sign-in flow cookie');
    if (!query.code || !query.state || !this.crypto.safeEqual(query.state, flow.state)) {
      throw new EntraFlowError('login_expired', 'state mismatch');
    }

    const client = this.clients.create();
    let result;
    try {
      result = await client.acquireTokenByCode(
        {
          code: query.code,
          scopes: scopesFor(flow.purpose),
          redirectUri: this.clients.redirectUri,
          codeVerifier: flow.codeVerifier,
          state: flow.state,
          nonce: flow.nonce,
        },
        { code: query.code, state: query.state },
      );
    } catch (error) {
      throw this.mapRedemptionError(error);
    }
    if (!result?.account) throw new EntraFlowError('login_failed', 'token response without an account');

    const identity = this.verifyIdentity(result.idTokenClaims as Record<string, unknown>);
    return {
      purpose: flow.purpose,
      returnTo: flow.returnTo,
      employeeId: flow.employeeId,
      identity,
      tokenCache: { homeAccountId: result.account.homeAccountId, serialized: client.getTokenCache().serialize() },
    };
  }

  /** Peeks at the flow cookie to know where to send a failed callback (sign-in page vs Integrations). */
  purposeOf(sealedFlow: string | null): EntraFlowPurpose {
    return this.readFlow(sealedFlow)?.purpose ?? 'SIGN_IN';
  }

  /* Cookie plumbing ---------------------------------------------------------- */

  writeFlowCookie(response: Response, value: string): void {
    response.cookie(this.session.flowCookieName, value, { ...this.flowCookieOptions(), maxAge: FLOW_TTL_MS });
  }

  readFlowCookie(request: Request): string | null {
    const value: unknown = request.cookies?.[this.session.flowCookieName];
    return typeof value === 'string' ? value : null;
  }

  clearFlowCookie(response: Response): void {
    response.clearCookie(this.session.flowCookieName, this.flowCookieOptions());
  }

  private flowCookieOptions(): CookieOptions {
    return { httpOnly: true, secure: this.session.secureCookies, sameSite: 'lax', path: '/' };
  }

  private readFlow(sealed: string | null): FlowState | null {
    if (!sealed) return null;
    const json = this.crypto.openFlowState(sealed);
    if (!json) return null;
    try {
      const flow = JSON.parse(json) as FlowState;
      return flow.v === 1 && Date.now() - flow.createdAt <= FLOW_TTL_MS ? flow : null;
    } catch {
      return null;
    }
  }

  /**
   * Single-tenant checks on the ID token. It came straight from the token
   * endpoint over TLS (OIDC Core §3.1.3.7), so claims are validated rather
   * than the signature: issuer + tenant + audience + expiry + a real object id.
   */
  private verifyIdentity(claims: Record<string, unknown> | undefined): EntraIdentity {
    if (!claims) throw new EntraFlowError('login_failed', 'no ID token claims');
    const tid = typeof claims.tid === 'string' ? claims.tid.toLowerCase() : '';
    if (tid !== this.clients.tenantId.toLowerCase()) throw new EntraFlowError('wrong_tenant', `token from tenant ${tid || 'unknown'}`);
    if (typeof claims.iss !== 'string' || claims.iss.toLowerCase() !== this.clients.expectedIssuer.toLowerCase()) {
      throw new EntraFlowError('wrong_tenant', `unexpected issuer ${String(claims.iss)}`);
    }
    if (claims.aud !== this.clients.clientId) throw new EntraFlowError('login_failed', 'ID token audience mismatch');
    if (typeof claims.exp !== 'number' || claims.exp * 1000 < Date.now() - 5 * 60_000) throw new EntraFlowError('login_expired', 'ID token expired');
    const oid = typeof claims.oid === 'string' ? claims.oid.toLowerCase() : '';
    if (!GUID.test(oid)) throw new EntraFlowError('login_failed', 'ID token without an object id');

    const rawEmail = typeof claims.email === 'string' && claims.email ? claims.email : claims.preferred_username;
    return {
      tenantId: tid,
      objectId: oid,
      email: typeof rawEmail === 'string' && rawEmail.includes('@') ? rawEmail.trim().toLowerCase() : null,
      displayName: typeof claims.name === 'string' ? claims.name : null,
    };
  }

  private mapRedemptionError(error: unknown): EntraFlowError {
    const code = error instanceof AuthError ? error.errorCode : '';
    const message = error instanceof Error ? error.message : String(error);
    this.logger.warn(`Authorization code redemption failed: ${code} ${message}`);
    if (code === 'state_mismatch' || code === 'invalid_grant' || message.includes('AADSTS54005') || message.includes('AADSTS70008')) {
      return new EntraFlowError('login_expired', message);
    }
    if (message.includes('AADSTS65001') || code === 'consent_required' || code === 'interaction_required') {
      return new EntraFlowError('consent_required', message);
    }
    if (code === 'network_error' || code === 'endpoints_resolution_error' || message.includes('fetch failed')) {
      return new EntraFlowError('service_unavailable', message);
    }
    return new EntraFlowError('login_failed', message);
  }
}

function scopesFor(purpose: EntraFlowPurpose): string[] {
  return purpose === 'CONNECT_AZURE_DEVOPS' ? AZURE_DEVOPS_SCOPES : SIGN_IN_SCOPES;
}

function mapAuthorizeError(error: string, description = ''): EntraFlowError['code'] {
  // AADSTS65001: consent missing; AADSTS90094 / 900941: admin approval required.
  if (error === 'consent_required' || /AADSTS(65001|90094|900941)/.test(description)) return 'consent_required';
  if (error === 'access_denied') return 'cancelled';
  if (error === 'temporarily_unavailable' || error === 'server_error') return 'service_unavailable';
  return 'login_failed';
}

/** Only same-app relative paths; anything else (absolute URLs, `//host`, API routes) falls back. */
export function safeReturnTo(value: unknown, fallback: string): string {
  if (typeof value !== 'string' || value.length > 300) return fallback;
  if (!value.startsWith('/') || value.startsWith('//') || value.startsWith('/\\') || value.startsWith('/api')) return fallback;
  // eslint-disable-next-line no-control-regex
  return /[\u0000-\u001f]/.test(value) ? fallback : value;
}
