import { createPinia } from 'pinia';
import { createApp } from 'vue';

import App from '@/App.vue';
import { soundManager } from '@/core/audio';
import { COMPANY_BRANDING } from '@/core/config/branding';
import { captureInstallPrompt } from '@/features/pwa/install-prompt';
import { router } from '@/app/router';
import '@/shared/styles/main.css';

import { restoreSession } from './restoreSession';

/**
 * Full app bootstrap sequence, called once from `main.ts`:
 * 1. start listening for the PWA install prompt (it can fire before the app mounts) and for the
 *    first user gesture (audio may only start after one)
 * 2. create the root Vue app and install Pinia
 * 3. restore (or, in demo mode, create) the session — before the router's first navigation
 * 4. install the router and mount
 */
export async function bootstrapApp(): Promise<void> {
  captureInstallPrompt();
  soundManager.install();
  document.title = `${COMPANY_BRANDING.companyName} · ${COMPANY_BRANDING.productName}`;
  const app = createApp(App);
  app.use(createPinia());

  await restoreSession();

  app.use(router);
  await router.isReady();
  app.mount('#app');
}
