import type { LayoutName } from '@/app/layouts/resolveLayout';

// Augments vue-router's RouteMeta so `meta.layout` / `meta.requiresAuth` are typed everywhere.
declare module 'vue-router' {
  interface RouteMeta {
    requiresAuth?: boolean;
    layout?: LayoutName;
  }
}

export {};
