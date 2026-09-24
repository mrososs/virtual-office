import type { NavigationGuardWithThis } from 'vue-router';

import { useAuthStore } from '@/stores/auth.store';

/**
 * Redirects unauthenticated users to /login for any route flagged
 * `meta.requiresAuth`. Session restoration itself is handled by
 * `app/bootstrap` before the router is mounted.
 */
export const requireAuthGuard: NavigationGuardWithThis<undefined> = (to) => {
  const requiresAuth = to.meta.requiresAuth !== false;
  if (!requiresAuth) return true;

  const authStore = useAuthStore();
  if (!authStore.isAuthenticated) {
    return { name: 'login', query: { redirect: to.fullPath } };
  }

  return true;
};
