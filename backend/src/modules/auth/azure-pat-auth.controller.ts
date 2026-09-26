import { BadRequestException, Body, Controller, HttpCode, Logger, Post, Req, Res } from '@nestjs/common';
import type { AuthMeResponse } from '@virtual-office/shared';
import type { Request, Response } from 'express';
import { AzurePatError, azurePatHttpException, isCredentialFailure } from '../azure-devops/azure-pat.errors';
import { resolveTokenExpiry } from '../azure-devops/dto/azure-token.dto';
import { ActiveAuthProvider } from '../session/active-auth-provider';
import { LoginRateLimiter } from '../session/login-rate-limiter';
import { SessionService } from '../session/session.service';
import { AzurePatLoginDto } from './dto/azure-pat-login.dto';
import { AzurePatAuthProvider } from './providers/azure-pat-auth.provider';
import { SignInService } from './sign-in.service';

/**
 * POST /api/auth/azure-pat/login — email + Azure DevOps PAT, once. Success
 * sets the HttpOnly session cookie and returns the same body as /auth/me; the
 * PAT is sealed server-side and never echoed. Failed checks are rate-limited
 * per email and per IP, and only our own error codes/messages leave here.
 */
@Controller('auth/azure-pat')
export class AzurePatAuthController {
  private readonly logger = new Logger(AzurePatAuthController.name);

  constructor(
    private readonly provider: ActiveAuthProvider,
    private readonly azurePat: AzurePatAuthProvider,
    private readonly signIn: SignInService,
    private readonly sessions: SessionService,
    private readonly limiter: LoginRateLimiter,
  ) {}

  @Post('login')
  @HttpCode(200)
  async login(@Body() dto: AzurePatLoginDto, @Req() request: Request, @Res({ passthrough: true }) response: Response): Promise<AuthMeResponse> {
    this.provider.assert('azure_pat');
    const expiresOn = resolveTokenExpiry(dto.expiresOn);
    if (expiresOn === 'past') throw new BadRequestException({ code: 'invalid_expiry', message: 'That expiry date is already in the past.' });

    const keys = this.limiter.keys({ ip: request.ip, email: dto.email });
    this.limiter.assertAllowed(keys);
    try {
      const { token, session, employee } = await this.azurePat.signIn({ email: dto.email, token: dto.token, expiresOn }, request.headers['user-agent'] ?? null);
      this.limiter.reset(keys);
      this.sessions.writeCookie(response, token, session);
      return await this.signIn.describe({ session, employee });
    } catch (error) {
      if (!(error instanceof AzurePatError)) throw error;
      if (isCredentialFailure(error.code)) this.limiter.recordFailure(keys);
      this.logger.warn(`Azure DevOps token sign-in refused: ${error.code}`);
      throw azurePatHttpException(error);
    }
  }
}
