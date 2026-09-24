import { createPinia } from 'pinia';
import { createApp } from 'vue';

import App from '@/App.vue';
import { setAuthTokenProvider } from '@/core/api';
import { router } from '@/app/router';
import { useAuthStore } from '@/stores/auth.store';
import '@/shared/styles/main.css';

import { restoreSession } from './restoreSession';

/**
 * Full app bootstrap sequence, called once from `main.ts`:
 * 1. create the root Vue app and install Pinia
 * 2. restore (or, in demo mode, create) the session — before the router's first navigation
 * 3. install the router and mount
 */
export async function bootstrapApp(): Promise<void> {
  const app = createApp(App);
  app.use(createPinia());

  await restoreSession();
  const authStore = useAuthStore();
  setAuthTokenProvider(() => (authStore.isDemoSession ? null : authStore.token));

  app.use(router);
  await router.isReady();
  app.mount('#app');
}
