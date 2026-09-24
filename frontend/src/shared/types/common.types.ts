/**
 * Generic reusable UI-layer types. NOT the workspace `@virtual-office/shared`
 * package — this is frontend-local shared code (components/composables/
 * utils/constants used across multiple features).
 */
export interface SelectOption<TValue = string> {
  label: string;
  value: TValue;
}

export type Size = 'sm' | 'md' | 'lg';
