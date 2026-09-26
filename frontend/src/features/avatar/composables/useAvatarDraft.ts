import {
  DEFAULT_AVATAR_APPEARANCE,
  normalizeAvatarAppearance,
  randomAvatarAppearance,
  sameAvatarAppearance,
  type AvatarAppearance,
  type AvatarSlot,
} from '@virtual-office/shared';
import { computed, ref, watch } from 'vue';

import { useAvatarStore } from '@/stores/avatar.store';
import { useNotificationStore } from '@/stores/notification.store';

/**
 * Editing state for the avatar creator. Changes apply to a local draft
 * (the live preview) and only persist on save.
 */
export function useAvatarDraft() {
  const avatarStore = useAvatarStore();
  const notifications = useNotificationStore();

  /** What "Reset" returns to: the saved avatar, or the starting look before the first save. */
  const baseline = computed<AvatarAppearance>(() =>
    avatarStore.ownProfile ? normalizeAvatarAppearance(avatarStore.ownProfile) : normalizeAvatarAppearance(avatarStore.starter ?? DEFAULT_AVATAR_APPEARANCE),
  );
  const draft = ref<AvatarAppearance>({ ...baseline.value });
  const dirty = computed(() => !sameAvatarAppearance(draft.value, baseline.value));
  /** First-time users must save once even if they keep the suggested look. */
  const needsSave = computed(() => dirty.value || !avatarStore.hasAvatar);

  // The profile may finish loading after the creator opens: adopt it unless the user already started editing.
  watch(baseline, (next, previous) => {
    if (sameAvatarAppearance(draft.value, previous)) draft.value = { ...next };
  });

  function select(slot: AvatarSlot, id: string | null): void {
    draft.value = normalizeAvatarAppearance({ ...draft.value, [slot]: id });
  }

  function reset(): void {
    draft.value = { ...baseline.value };
  }

  function randomize(): void {
    draft.value = randomAvatarAppearance();
  }

  async function save(): Promise<boolean> {
    try {
      await avatarStore.save(draft.value);
      notifications.notify({ kind: 'SYSTEM', tone: 'success', title: 'Avatar saved', body: 'Teammates see your new look right away.' });
      return true;
    } catch (error) {
      notifications.notify({ kind: 'SYSTEM', tone: 'danger', title: 'Could not save your avatar', body: error instanceof Error ? error.message : undefined });
      return false;
    }
  }

  return { draft, dirty, needsSave, saving: computed(() => avatarStore.saving), select, reset, randomize, save };
}
