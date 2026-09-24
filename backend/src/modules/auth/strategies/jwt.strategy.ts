import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AppConfig } from '../../../config/configuration';
import { AuthenticatedUser } from '../../../common/decorators/current-user.decorator';
import { AuthService, type AccessTokenClaims } from '../auth.service';

/**
 * Validates the bearer JWT issued by `AuthService.signToken`. Real credential
 * verification (Supabase Auth session, SSO, etc.) is out of scope for this
 * scaffold — see TODOs in `auth.service.ts`.
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    private readonly authService: AuthService,
  ) {
    const { auth } = configService.get<AppConfig>('app')!;
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: auth.jwtSecret || 'dev-secret-do-not-use-in-production',
    });
  }

  validate(payload: AccessTokenClaims): AuthenticatedUser {
    if (!this.authService.acceptsClaims(payload)) throw new UnauthorizedException();
    // Passport attaches whatever this returns to `request.user`.
    return {
      userId: payload.sub,
      organizationId: payload.organizationId,
      email: payload.email,
      employeeId: payload.employeeId,
    };
  }
}
