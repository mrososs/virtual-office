import { onBeforeUnmount, shallowRef } from 'vue';

import { soundManager, type SoundPreferences } from '@/core/audio';

/** Reactive view of the (per-browser) sound preferences. The SoundManager stays the single source of truth. */
export function useSoundPreferences() {
  const preferences = shallowRef<SoundPreferences>(soundManager.getPreferences());
  const unsubscribe = soundManager.subscribe((next) => (preferences.value = next));
  onBeforeUnmount(unsubscribe);

  return {
    preferences,
    update: (patch: Partial<SoundPreferences>) => soundManager.updatePreferences(patch),
    reset: () => soundManager.resetPreferences(),
  };
}
