import type { RouteRecordRaw } from 'vue-router';

/**
 * Route definitions. The office side panels are child routes of the office
 * page, so switching Team / Meetings / Activity never remounts the Phaser
 * canvas. Feature pages are lazy-loaded to keep the initial bundle small.
 */
export const routes: RouteRecordRaw[] = [
  { path: '/', redirect: { name: 'office' } },
  {
    path: '/office',
    component: () => import('@/features/office/pages/OfficePage.vue'),
    meta: { requiresAuth: true, layout: 'app' },
    children: [
      { path: '', name: 'office', component: () => import('@/features/office/components/OfficeNoPanel.vue') },
      { path: 'team', name: 'office-team', component: () => import('@/features/employees/components/TeamPanel.vue') },
      { path: 'meetings', name: 'office-meetings', component: () => import('@/features/meetings/components/MeetingsPanel.vue') },
      { path: 'activity', name: 'office-activity', component: () => import('@/features/activity/components/ActivityPanel.vue') },
    ],
  },
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
    path: '/settings/azure-devops',
    name: 'settings-azure-devops',
    component: () => import('@/features/azure-devops/pages/AzureDevOpsSettingsPage.vue'),
    meta: { requiresAuth: true, layout: 'app' },
  },
  {
    path: '/settings/microsoft',
    name: 'settings-microsoft',
    component: () => import('@/features/microsoft/pages/MicrosoftSettingsPage.vue'),
    meta: { requiresAuth: true, layout: 'app' },
  },
  {
    path: '/login',
    name: 'login',
    component: () => import('@/features/settings/pages/LoginPage.vue'),
    meta: { requiresAuth: false, layout: 'auth' },
  },
  { path: '/:pathMatch(.*)*', redirect: { name: 'office' } },
];
