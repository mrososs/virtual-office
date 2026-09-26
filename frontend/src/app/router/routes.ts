import type { RouteRecordRaw } from 'vue-router';

/**
 * Route definitions. The office side panels are child routes of the office
 * page, so switching Team / Meetings / Activity never remounts the Phaser
 * canvas. Feature pages are lazy-loaded to keep the initial bundle small.
 * Microsoft sign-in has no frontend callback: the backend handles
 * `/api/auth/microsoft/callback` and redirects into the app.
 */
export const routes: RouteRecordRaw[] = [
  { path: '/', redirect: { name: 'office' } },
  {
    path: '/office',
    component: () => import('@/features/office/pages/OfficePage.vue'),
    meta: { requiresAuth: true, requiresAvatar: true, layout: 'app' },
    children: [
      { path: '', name: 'office', component: () => import('@/features/office/components/OfficeNoPanel.vue') },
      { path: 'team', name: 'office-team', component: () => import('@/features/employees/components/TeamPanel.vue') },
      { path: 'meetings', name: 'office-meetings', component: () => import('@/features/meetings/components/MeetingsPanel.vue') },
      { path: 'activity', name: 'office-activity', component: () => import('@/features/activity/components/ActivityPanel.vue') },
      // Edit Avatar as an overlay: the office stays mounted, so saving re-skins you live.
      { path: 'avatar', name: 'office-avatar', component: () => import('@/features/avatar/components/AvatarEditorOverlay.vue'), meta: { overlay: true } },
    ],
  },
  {
    // First-time setup (and a standalone editor): reached before the office when you have no avatar yet.
    path: '/profile/avatar',
    name: 'avatar-setup',
    component: () => import('@/features/avatar/pages/AvatarSetupPage.vue'),
    meta: { requiresAuth: true, layout: 'onboarding' },
  },
  { path: '/avatar', redirect: (to) => ({ name: 'avatar-setup', query: to.query }) },
  {
    path: '/integrations',
    name: 'integrations',
    component: () => import('@/features/integrations/pages/IntegrationsPage.vue'),
    meta: { requiresAuth: true, layout: 'app' },
  },
  {
    path: '/settings',
    name: 'settings',
    component: () => import('@/features/settings/pages/SettingsPage.vue'),
    meta: { requiresAuth: true, layout: 'app' },
  },
  {
    path: '/login',
    name: 'login',
    component: () => import('@/features/auth/pages/LoginPage.vue'),
    meta: { requiresAuth: false, guestOnly: true, layout: 'auth' },
  },
  { path: '/:pathMatch(.*)*', redirect: { name: 'office' } },
];
