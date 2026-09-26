import { runtimeEnv } from '@/core/config';
import { useAuthStore } from '@/stores/auth.store';
import { useAvatarStore } from '@/stores/avatar.store';

/**
 * Establishes the session before the router's first navigation so the auth
 * guard sees it. Production asks the backend (`/api/auth/me`, cookie-based);
 * demo mode is the single, explicit exception — nothing else in the app knows
 * or checks whether a session is a demo one.
 */
export async function restoreSession(): Promise<void> {
  if (runtimeEnv.demoMode) {
    const { demoSessionService } = await import('@/demo/demo-session.service');
    demoSessionService.start();
    return;
  }
  const me = await useAuthStore().restore();
  // /auth/me already says whether this employee has an avatar: no second request for first-login routing.
  if (me) useAvatarStore().prime(me.employee.id, me.employee.avatar);
}
