import { createRouter, createWebHistory } from 'vue-router';

import { requireAuthGuard, requireAvatarGuard } from './guards';
import { routes } from './routes';

export const router = createRouter({
  history: createWebHistory(),
  routes,
});

router.beforeEach(requireAuthGuard);
router.beforeEach(requireAvatarGuard);

export * from './routes';
