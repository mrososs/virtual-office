import { CanActivate, ExecutionContext, Injectable, UnauthorizedException, createParamDecorator } from '@nestjs/common';
import { SessionService } from './session.service';
import type { AuthContext, AuthenticatedRequest } from './session.types';

/**
 * Protects a route with the application session cookie. On success the
 * caller's session and employee are available via `@CurrentSession()`.
 */
@Injectable()
export class SessionAuthGuard implements CanActivate {
  constructor(private readonly sessions: SessionService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const auth = await this.sessions.resolve(this.sessions.readToken(request));
    if (!auth) throw new UnauthorizedException({ code: 'unauthenticated', message: 'Sign in to continue' });
    request.auth = auth;
    return true;
  }
}

/** `@CurrentSession() auth: AuthContext` — only valid on routes behind `SessionAuthGuard`. */
export const CurrentSession = createParamDecorator((_data: unknown, context: ExecutionContext): AuthContext => {
  const auth = context.switchToHttp().getRequest<AuthenticatedRequest>().auth;
  if (!auth) throw new UnauthorizedException();
  return auth;
});
