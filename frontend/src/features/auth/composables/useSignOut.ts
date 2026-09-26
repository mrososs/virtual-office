import { shallowRef } from 'vue';

import { useAuthStore } from '@/stores/auth.store';

/**
 * Signs out and hard-navigates to /login: the reload tears down Phaser, the
 * socket (so office presence ends immediately) and every store, leaving no
 * stale office state behind. The server has already closed this session's
 * sockets by then.
 */
export function useSignOut() {
  const authStore = useAuthStore();
  const signingOut = shallowRef(false);

  async function signOut(reason: 'signedOut' | 'sessionEnded' = 'signedOut'): Promise<void> {
    if (signingOut.value) return;
    signingOut.value = true;
    if (reason === 'signedOut') await authStore.logout();
    window.location.assign(`/login?${reason}=1`);
  }

  return { signOut, signingOut };
}
