import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import type { UUID } from '@virtual-office/shared';
import { AppConfig } from '../../config/configuration';

/** Claims of a demo realtime token. `demo: true` is mandatory — nothing else is ever accepted from a JWT. */
export interface DemoTokenClaims {
  sub: string;
  organizationId: string;
  employeeId: UUID;
  demo: true;
}

/**
 * Demo identities only. Production identity is the Microsoft-backed session
 * cookie; JWTs are never accepted for it. Tokens are verified only while demo
 * mode is on (DEMO_MODE=true and NODE_ENV≠production), so a demo token can
 * never authenticate against a production backend — even one that shares
 * JWT_SECRET.
 */
@Injectable()
export class DemoTokenService {
  private readonly demoMode: boolean;
  private readonly expiresIn: string;

  constructor(
    private readonly jwtService: JwtService,
    configService: ConfigService,
  ) {
    const app = configService.get<AppConfig>('app')!;
    this.demoMode = app.demoMode;
    this.expiresIn = app.demo.tokenExpiresIn;
  }

  get enabled(): boolean {
    return this.demoMode;
  }

  get tokenExpiresIn(): string {
    return this.expiresIn;
  }

  sign(employeeId: UUID, organizationId: string): string {
    if (!this.demoMode) throw new Error('Demo tokens are disabled');
    const claims: DemoTokenClaims = { sub: `demo:${employeeId}`, organizationId, employeeId, demo: true };
    return this.jwtService.sign(claims);
  }

  /** The verified claims, or null (demo mode off, missing, expired, tampered, or not a demo token). */
  verify(token: string): DemoTokenClaims | null {
    if (!this.demoMode) return null;
    try {
      const claims = this.jwtService.verify<DemoTokenClaims>(token);
      return claims.demo === true && typeof claims.employeeId === 'string' && typeof claims.organizationId === 'string' ? claims : null;
    } catch {
      return null;
    }
  }
}
