import { onScopeDispose, watch, type Ref, type ShallowRef } from 'vue';

/** Calls `handler` on pointerdown outside `target` while `active` is true (dropdowns, popovers). */
export function useClickOutside(
  target: Readonly<ShallowRef<HTMLElement | null>>,
  active: Ref<boolean>,
  handler: () => void,
): void {
  const listener = (event: PointerEvent) => {
    const element = target.value;
    if (element && event.target instanceof Node && !element.contains(event.target)) handler();
  };

  watch(
    active,
    (isActive) => {
      if (isActive) document.addEventListener('pointerdown', listener, true);
      else document.removeEventListener('pointerdown', listener, true);
    },
    { immediate: true },
  );

  onScopeDispose(() => document.removeEventListener('pointerdown', listener, true));
}
