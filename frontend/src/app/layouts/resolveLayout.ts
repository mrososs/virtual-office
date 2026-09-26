import type { Component } from 'vue';

import AppLayout from './AppLayout.vue';
import AuthLayout from './AuthLayout.vue';
import OnboardingLayout from './OnboardingLayout.vue';

const layoutsByName = {
  app: AppLayout,
  auth: AuthLayout,
  onboarding: OnboardingLayout,
} satisfies Record<string, Component>;

export type LayoutName = keyof typeof layoutsByName;

export function resolveLayout(name: LayoutName | undefined): Component {
  return layoutsByName[name ?? 'app'];
}
