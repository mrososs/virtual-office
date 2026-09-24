import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * Shape attached to `request.user` by the JWT strategy after a token is
 * validated. Distinct from the shared `Employee` domain type — this is the
 * platform account identity, not the virtual-office avatar/domain record.
 */
export interface AuthenticatedUser {
  userId: string;
  organizationId: string;
  email: string;
  employeeId: string;
}

/**
 * Pulls the authenticated platform user off the request, populated by
 * `JwtStrategy.validate()`. Use as `@CurrentUser() user: AuthenticatedUser`.
 */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthenticatedUser => {
    const request = ctx.switchToHttp().getRequest();
    return request.user as AuthenticatedUser;
  },
);
