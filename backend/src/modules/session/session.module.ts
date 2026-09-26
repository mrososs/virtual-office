import { Global, Module } from '@nestjs/common';
import { ActiveAuthProvider } from './active-auth-provider';
import { LoginRateLimiter } from './login-rate-limiter';
import { SessionAuthGuard } from './session-auth.guard';
import { SessionEvents } from './session-events';
import { SessionRepository } from './session.repository';
import { SessionService } from './session.service';

/**
 * Global so any feature controller can use `SessionAuthGuard` without
 * importing the auth module (which itself depends on employees, Entra and
 * integrations).
 */
@Global()
@Module({
  providers: [SessionRepository, SessionService, SessionEvents, SessionAuthGuard, ActiveAuthProvider, LoginRateLimiter],
  exports: [SessionService, SessionEvents, SessionAuthGuard, ActiveAuthProvider, LoginRateLimiter],
})
export class SessionModule {}
