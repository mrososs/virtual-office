import { ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * Thin wrapper around Passport's JWT strategy (registered in
 * `modules/auth/strategies/jwt.strategy.ts`). Apply with `@UseGuards(JwtAuthGuard)`
 * on any controller/route that requires an authenticated platform user.
 *
 * TODO: add support for a `@Public()` decorator override once public routes
 * (e.g. webhooks) need to live alongside guarded ones in the same controller.
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  canActivate(context: ExecutionContext) {
    // TODO: short-circuit here for routes marked with a `@Public()` decorator.
    return super.canActivate(context);
  }
}
