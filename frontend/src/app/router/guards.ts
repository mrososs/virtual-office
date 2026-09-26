import type { NavigationGuardWithThis } from 'vue-router';

import { useAuthStore } from '@/stores/auth.store';
import { useAvatarStore } from '@/stores/avatar.store';

/**
 * Redirects unauthenticated users to /login for any route flagged
 * `meta.requiresAuth` — including when the session could not be checked
 * (backend down): /login explains that and offers Retry, and never bounces
 * to Microsoft on its own, so there is no redirect loop. Session restoration
 * itself happens in `app/bootstrap` before the router is mounted.
 */
export const requireAuthGuard: NavigationGuardWithThis<undefined> = (to) => {
  const authStore = useAuthStore();

  if (to.meta.guestOnly && authStore.isAuthenticated) {
    const redirect = typeof to.query.redirect === 'string' && to.query.redirect.startsWith('/') ? to.query.redirect : '/office';
    return redirect;
  }

  const requiresAuth = to.meta.requiresAuth !== false;
  if (!requiresAuth) return true;

  if (!authStore.isAuthenticated) {
    return { name: 'login', query: { redirect: to.fullPath } };
  }

  return true;
};

/**
 * First-time flow: signed in → no saved avatar yet → avatar creator → office.
 * Once a profile exists this is a cached no-op, so nobody recreates their
 * avatar every session. If profiles cannot be loaded (e.g. the API is not
 * available), the office still opens and renders the default look.
 */
export const requireAvatarGuard: NavigationGuardWithThis<undefined> = async (to) => {
  if (!to.matched.some((record) => record.meta.requiresAvatar)) return true;
  if (!useAuthStore().isAuthenticated) return true;

  const avatarStore = useAvatarStore();
  await avatarStore.ensureLoaded();
  if (avatarStore.status === 'ready' && !avatarStore.hasAvatar) {
    return { name: 'avatar-setup', query: { redirect: to.fullPath } };
  }
  return true;
};
