import { runtimeEnv } from '@/core/config';

/**
 * Establishes the session before the router's first navigation so the auth
 * guard sees it. Demo mode is the single, explicit exception to real auth —
 * nothing else in the app knows or checks whether a session is a demo one.
 */
export async function restoreSession(): Promise<void> {
  if (runtimeEnv.demoMode) {
    const { demoSessionService } = await import('@/demo/demo-session.service');
    demoSessionService.start();
    return;
  }
  // TODO: restore a real session (Supabase/SSO refresh) once the auth module is implemented.
}
