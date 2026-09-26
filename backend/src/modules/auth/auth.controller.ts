import { Controller, Get, HttpCode, Logger, Post, Req, Res, UseGuards } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { AuthConfigResponse, AuthMeResponse, RealtimeTicketResponse } from '@virtual-office/shared';
import type { Request, Response } from 'express';
import { AppConfig } from '../../config/configuration';
import { AzureDevOpsConnectionService } from '../azure-devops/azure-devops-connection.service';
import { ActiveAuthProvider } from '../session/active-auth-provider';
import { CurrentSession, SessionAuthGuard } from '../session/session-auth.guard';
import { SessionService } from '../session/session.service';
import type { AuthContext } from '../session/session.types';
import { SignInService } from './sign-in.service';

/**
 * Provider-independent session endpoints. The browser only ever holds our
 * HttpOnly session cookie — never a PAT, Microsoft token or client secret.
 *
 *   GET  /api/auth/config  → which sign-in the login page shows (public)
 *   GET  /api/auth/me      → the signed-in employee (401 otherwise)
 *   POST /api/auth/logout  → session destroyed, cookie cleared, sockets closed
 *   POST /api/auth/realtime-ticket → single-use socket ticket (SPA and socket host on different sites)
 *
 * Provider sign-in lives in AzurePatAuthController (current) and
 * MicrosoftEntraAuthController (future).
 */
@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);
  private readonly azureConfig: AppConfig['azureDevOps'];

  constructor(
    configService: ConfigService,
    private readonly provider: ActiveAuthProvider,
    private readonly signIn: SignInService,
    private readonly sessions: SessionService,
    private readonly azureDevOps: AzureDevOpsConnectionService,
  ) {
    this.azureConfig = configService.get<AppConfig>('app')!.azureDevOps;
  }

  @Get('config')
  config(): AuthConfigResponse {
    return {
      provider: this.provider.id,
      azureDevOps: { organization: this.azureConfig.organization || null, project: this.azureConfig.project || null },
    };
  }

  @UseGuards(SessionAuthGuard)
  @Get('me')
  me(@CurrentSession() auth: AuthContext): Promise<AuthMeResponse> {
    // Notices an expired/revoked Azure token in the background; entering the office never waits for Azure.
    this.azureDevOps.refreshIfStale(auth.employee.id);
    return this.signIn.describe(auth);
  }

  /** Trades the cookie session for a 60-second, single-use Socket.IO ticket (see SessionService). */
  @UseGuards(SessionAuthGuard)
  @Post('realtime-ticket')
  @HttpCode(200)
  realtimeTicket(@CurrentSession() auth: AuthContext): RealtimeTicketResponse {
    return this.sessions.issueRealtimeTicket(auth.session);
  }

  /** Always clears the cookie, even if the session is already gone or the database is down. */
  @Post('logout')
  @HttpCode(204)
  async logout(@Req() request: Request, @Res({ passthrough: true }) response: Response): Promise<void> {
    try {
      const auth = await this.sessions.resolve(this.sessions.readToken(request));
      if (auth) await this.sessions.end(auth.session, 'SIGNED_OUT');
    } catch (error) {
      this.logger.warn(`Logout could not delete the session: ${error instanceof Error ? error.message : String(error)}`);
    }
    this.sessions.clearCookie(response);
  }
}
