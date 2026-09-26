import { Controller, Get, Logger, Query, Req, Res } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { AzureDevOpsConnectResult, SignInErrorCode } from '@virtual-office/shared';
import type { Request, Response } from 'express';
import { AppConfig } from '../../config/configuration';
import { AzureConnectError, AzureDevOpsConnectionService } from '../azure-devops/azure-devops-connection.service';
import { EntraAuthCodeFlowService, type CallbackQuery } from '../entra/entra-auth-code-flow.service';
import { EntraFlowError } from '../entra/entra.errors';
import { ActiveAuthProvider } from '../session/active-auth-provider';
import { SessionService } from '../session/session.service';
import { MicrosoftEntraAuthProvider } from './providers/microsoft-entra-auth.provider';

/**
 * AUTH_PROVIDER=microsoft_entra only — INACTIVE in the current azure_pat mode
 * (both routes then send people back to /login). Kept ready for when iSaned IT
 * approves the Entra app registration (docs/MICROSOFT_AUTH_SETUP.md):
 *
 *   GET /api/auth/microsoft/login     → 302 to Microsoft (single iSaned tenant, PKCE)
 *   GET /api/auth/microsoft/callback  → session cookie, 302 back into the app
 *                                        (also completes Azure DevOps consent)
 */
@Controller('auth/microsoft')
export class MicrosoftEntraAuthController {
  private readonly logger = new Logger(MicrosoftEntraAuthController.name);
  private readonly appUrl: string;

  constructor(
    configService: ConfigService,
    private readonly provider: ActiveAuthProvider,
    private readonly flow: EntraAuthCodeFlowService,
    private readonly entra: MicrosoftEntraAuthProvider,
    private readonly sessions: SessionService,
    private readonly azureDevOps: AzureDevOpsConnectionService,
  ) {
    this.appUrl = configService.get<AppConfig>('app')!.appUrl;
  }

  @Get('login')
  async login(@Query('returnTo') returnTo: unknown, @Res() response: Response): Promise<void> {
    if (!this.provider.is('microsoft_entra') || !this.flow.isConfigured()) return this.toLogin(response, 'not_configured');
    try {
      const { url, flowCookie } = await this.flow.begin('SIGN_IN', { returnTo });
      this.flow.writeFlowCookie(response, flowCookie);
      response.redirect(url);
    } catch (error) {
      this.logger.warn(`Could not start Microsoft sign-in: ${error instanceof Error ? error.message : String(error)}`);
      this.toLogin(response, 'service_unavailable');
    }
  }

  @Get('callback')
  async callback(@Query() query: CallbackQuery, @Req() request: Request, @Res() response: Response): Promise<void> {
    if (!this.provider.is('microsoft_entra')) return this.toLogin(response, 'not_configured');
    const sealedFlow = this.flow.readFlowCookie(request);
    this.flow.clearFlowCookie(response);
    const purpose = this.flow.purposeOf(sealedFlow);

    try {
      const result = await this.flow.complete(query, sealedFlow);

      if (result.purpose === 'SIGN_IN') {
        const { token, session } = await this.entra.signInWith(result, request.headers['user-agent'] ?? null);
        this.sessions.writeCookie(response, token, session);
        return response.redirect(`${this.appUrl}${result.returnTo}`);
      }

      // Incremental consent: only for the employee who started it, still signed in.
      const auth = await this.sessions.resolve(this.sessions.readToken(request));
      if (!auth || auth.employee.id !== result.employeeId) return this.toLogin(response, 'login_expired');
      await this.azureDevOps.completeEntraConnect(auth, result);
      return this.toIntegrations(response, 'connected');
    } catch (error) {
      if (purpose === 'CONNECT_AZURE_DEVOPS') return this.toIntegrations(response, connectResultOf(error));
      if (!(error instanceof EntraFlowError)) this.logger.error('Sign-in callback failed', error instanceof Error ? error.stack : String(error));
      return this.toLogin(response, error instanceof EntraFlowError ? error.code : 'login_failed');
    }
  }

  private toLogin(response: Response, error: SignInErrorCode): void {
    response.redirect(`${this.appUrl}/login?error=${error}`);
  }

  private toIntegrations(response: Response, result: AzureDevOpsConnectResult): void {
    response.redirect(`${this.appUrl}/integrations?azureDevOps=${result}`);
  }
}

function connectResultOf(error: unknown): AzureDevOpsConnectResult {
  if (error instanceof AzureConnectError) return error.result;
  if (error instanceof EntraFlowError) {
    if (error.code === 'cancelled' || error.code === 'consent_required' || error.code === 'service_unavailable') return error.code;
    if (error.code === 'wrong_tenant') return 'account_mismatch';
  }
  return 'failed';
}
