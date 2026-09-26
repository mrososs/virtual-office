import { BadRequestException, Body, Controller, Delete, Get, HttpCode, Logger, Post, Req, Res, UseGuards } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { AzureSyncNowResponse, AzureTokenUpdateResponse, IntegrationsStatusResponse, WorkSnapshot } from '@virtual-office/shared';
import type { Request, Response } from 'express';
import { AppConfig } from '../../config/configuration';
import { EntraAuthCodeFlowService } from '../entra/entra-auth-code-flow.service';
import { ActiveAuthProvider } from '../session/active-auth-provider';
import { LoginRateLimiter } from '../session/login-rate-limiter';
import { CurrentSession, SessionAuthGuard } from '../session/session-auth.guard';
import { SessionService } from '../session/session.service';
import type { AuthContext } from '../session/session.types';
import { AzureDevOpsConnectionService } from './azure-devops-connection.service';
import { AzurePatError, azurePatHttpException, isCredentialFailure } from './azure-pat.errors';
import { AzureSyncService } from './azure-sync.service';
import { AzureWorkService } from './azure-work.service';
import { AzureTokenDto, resolveTokenExpiry } from './dto/azure-token.dto';

/**
 * Integrations page backend. The employee's own Azure DevOps connection:
 *
 *   GET    /api/integrations/status
 *   POST   /api/integrations/azure/token    save / replace my PAT (verified, sealed, never echoed)
 *   POST   /api/integrations/azure/verify   re-check my saved credential now
 *   POST   /api/integrations/azure/sync     run the team sync now (my credential first)
 *   DELETE /api/integrations/azure          forget my credential (my account stays)
 *   GET    /api/integrations/azure/connect  Entra consent — only when AUTH_PROVIDER=microsoft_entra
 */
@Controller('integrations')
export class IntegrationsController {
  private readonly logger = new Logger(IntegrationsController.name);
  private readonly appUrl: string;

  constructor(
    configService: ConfigService,
    private readonly provider: ActiveAuthProvider,
    private readonly sessions: SessionService,
    private readonly flow: EntraAuthCodeFlowService,
    private readonly connections: AzureDevOpsConnectionService,
    private readonly sync: AzureSyncService,
    private readonly limiter: LoginRateLimiter,
  ) {
    this.appUrl = configService.get<AppConfig>('app')!.appUrl;
  }

  @UseGuards(SessionAuthGuard)
  @Get('status')
  async status(@CurrentSession() auth: AuthContext): Promise<IntegrationsStatusResponse> {
    return {
      authProvider: this.provider.id,
      microsoft: this.provider.is('microsoft_entra') ? { connected: true, email: auth.employee.email, displayName: auth.employee.displayName } : null,
      azureDevOps: await this.connections.status(auth),
      teams: { status: 'UNAVAILABLE' },
    };
  }

  @UseGuards(SessionAuthGuard)
  @Post('azure/token')
  @HttpCode(200)
  async saveToken(@CurrentSession() auth: AuthContext, @Body() dto: AzureTokenDto): Promise<AzureTokenUpdateResponse> {
    const expiresOn = resolveTokenExpiry(dto.expiresOn);
    if (expiresOn === 'past') throw new BadRequestException({ code: 'invalid_expiry', message: 'That expiry date is already in the past.' });
    const keys = this.limiter.keys({ employee: auth.employee.id });
    this.limiter.assertAllowed(keys);
    try {
      const result = await this.connections.savePat(auth.employee, dto.token, expiresOn);
      this.limiter.reset(keys);
      return result;
    } catch (error) {
      if (!(error instanceof AzurePatError)) throw error;
      if (isCredentialFailure(error.code)) this.limiter.recordFailure(keys);
      this.logger.warn(`Azure DevOps token update refused for ${auth.employee.id}: ${error.code}`);
      throw azurePatHttpException(error);
    }
  }

  @UseGuards(SessionAuthGuard)
  @Post('azure/verify')
  @HttpCode(200)
  verify(@CurrentSession() auth: AuthContext): Promise<AzureTokenUpdateResponse> {
    return this.connections.verify(auth.employee.id);
  }

  @UseGuards(SessionAuthGuard)
  @Post('azure/sync')
  @HttpCode(200)
  syncNow(@CurrentSession() auth: AuthContext): Promise<AzureSyncNowResponse> {
    return this.sync.syncNow(auth.employee.id);
  }

  @UseGuards(SessionAuthGuard)
  @Delete('azure')
  @HttpCode(204)
  async disconnect(@CurrentSession() auth: AuthContext): Promise<void> {
    await this.connections.disconnect(auth.employee.id);
  }

  /** Future Entra mode: incremental consent for the Azure DevOps read scopes, back through the Microsoft callback. */
  @Get('azure/connect')
  async connect(@Req() request: Request, @Res() response: Response): Promise<void> {
    const auth = await this.sessions.resolve(this.sessions.readToken(request)).catch(() => null);
    if (!auth) return response.redirect(`${this.appUrl}/login?redirect=${encodeURIComponent('/integrations')}`);
    if (!this.provider.is('microsoft_entra') || !this.flow.isConfigured() || !this.connections.isConfigured()) {
      return response.redirect(`${this.appUrl}/integrations?azureDevOps=not_configured`);
    }
    try {
      const { url, flowCookie } = await this.flow.begin('CONNECT_AZURE_DEVOPS', {
        returnTo: '/integrations',
        loginHint: auth.employee.email,
        employeeId: auth.employee.id,
      });
      this.flow.writeFlowCookie(response, flowCookie);
      response.redirect(url);
    } catch (error) {
      this.logger.warn(`Could not start Azure DevOps consent: ${error instanceof Error ? error.message : String(error)}`);
      response.redirect(`${this.appUrl}/integrations?azureDevOps=service_unavailable`);
    }
  }
}

/** Current Azure DevOps work data (refetched by clients after `work:synced`). */
@UseGuards(SessionAuthGuard)
@Controller('work')
export class WorkController {
  constructor(private readonly work: AzureWorkService) {}

  @Get()
  snapshot(): Promise<WorkSnapshot> {
    return this.work.getSnapshot();
  }
}
