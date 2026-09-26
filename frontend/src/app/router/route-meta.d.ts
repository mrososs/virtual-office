import type { LayoutName } from '@/app/layouts/resolveLayout';

// Augments vue-router's RouteMeta so `meta.layout` / `meta.requiresAuth` are typed everywhere.
declare module 'vue-router' {
  interface RouteMeta {
    requiresAuth?: boolean;
    /** Signed-in users skip this page (e.g. /login) and go to the office. */
    guestOnly?: boolean;
    /** Send users without a saved avatar to first-time setup first. */
    requiresAvatar?: boolean;
    /** Child route rendered over the office instead of as a side panel. */
    overlay?: boolean;
    layout?: LayoutName;
  }
}

export {};
