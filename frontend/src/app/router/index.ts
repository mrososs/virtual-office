import { createRouter, createWebHistory } from 'vue-router';

import { requireAuthGuard } from './guards';
import { routes } from './routes';

export const router = createRouter({
  history: createWebHistory(),
  routes,
});

router.beforeEach(requireAuthGuard);

export * from './routes';
