import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { AppConfig } from '../../config/configuration';
import { LoginDto, AuthTokenResponseDto } from './dto/login.dto';

/**
 * Claims carried by every platform access token, whether issued by the real
 * login flow or by the isolated demo session endpoint (`modules/demo`).
 */
export interface AccessTokenClaims {
  sub: string;
  organizationId: string;
  email: string;
  employeeId: string;
  demo?: boolean;
}

/**
 * Platform authentication (email/password or SSO -> JWT). This is distinct
 * from the Microsoft/Azure OAuth flows in `modules/microsoft` and
 * `modules/azure-devops`, which authenticate the *backend* to call those
 * external APIs on an employee's behalf, not a person logging into the app.
 */
@Injectable()
export class AuthService {
  private readonly demoMode: boolean;

  constructor(
    private readonly jwtService: JwtService,
    configService: ConfigService,
  ) {
    this.demoMode = configService.get<AppConfig>('app')!.demoMode;
  }

  /**
   * Demo tokens are only honored while demo mode is on, so a token minted by
   * a demo backend can never authenticate against one running without it
   * (e.g. production), even if the two ever shared a signing secret.
   */
  acceptsClaims(claims: Pick<AccessTokenClaims, 'demo'>): boolean {
    return claims.demo !== true || this.demoMode;
  }

  async login(dto: LoginDto): Promise<AuthTokenResponseDto> {
    // TODO: verify credentials against Supabase Auth (or another IdP) instead
    // of trusting the payload outright.
    void dto;
    throw new UnauthorizedException('Not implemented');
  }

  async validateUserById(userId: string): Promise<boolean> {
    // TODO: look up the platform user (via UsersService) to confirm they
    // still exist / are active before trusting a JWT's claims.
    void userId;
    return false;
  }

  signToken(claims: AccessTokenClaims): string {
    return this.jwtService.sign(claims);
  }

  /** Returns the verified claims, or null for a missing/expired/tampered token. */
  verifyToken(token: string): AccessTokenClaims | null {
    try {
      const claims = this.jwtService.verify<AccessTokenClaims>(token);
      const wellFormed = typeof claims.employeeId === 'string' && typeof claims.organizationId === 'string';
      return wellFormed && this.acceptsClaims(claims) ? claims : null;
    } catch {
      return null;
    }
  }
}
