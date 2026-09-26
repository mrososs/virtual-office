import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { AuthProviderId } from '@virtual-office/shared';
import { AppConfig } from '../../config/configuration';

/**
 * The one place that knows how this deployment signs people in (AUTH_PROVIDER).
 * Provider-specific endpoints ask it before doing anything; everything after
 * sign-in (sessions, /auth/me, the office) is identical for every provider.
 */
@Injectable()
export class ActiveAuthProvider {
  readonly id: AuthProviderId;

  constructor(configService: ConfigService) {
    this.id = configService.get<AppConfig>('app')!.authProvider;
  }

  is(provider: AuthProviderId): boolean {
    return this.id === provider;
  }

  /** Endpoints of an inactive provider behave as if they did not exist. */
  assert(provider: AuthProviderId): void {
    if (this.id !== provider) throw new NotFoundException({ code: 'provider_inactive', message: `Sign-in via ${provider} is not enabled on this server` });
  }
}
