import type { AvatarAppearance, AvatarProfile, UUID } from '@virtual-office/shared';
import { defineStore } from 'pinia';

import { runtimeEnv } from '@/core/config';
import { resolveAvatarProfileRepository } from '@/features/avatar/data/avatar-profile-repository';

import { useAuthStore } from './auth.store';
import { useEmployeeStore } from './employee.store';

type AvatarLoadStatus = 'idle' | 'loading' | 'ready' | 'error';

interface AvatarStoreState {
  /** Whose profile is loaded (the signed-in employee). */
  employeeId: UUID | null;
  /** Null until the user saves an avatar for the first time. */
  ownProfile: AvatarProfile | null;
  /** Starting look for the creator when there is no profile yet. */
  starter: AvatarAppearance | null;
  status: AvatarLoadStatus;
  error: string | null;
  saving: boolean;
}

let inflight: Promise<void> | null = null;

/**
 * The signed-in user's own avatar: whether they have one (drives first-time
 * setup), and saving it. Everyone's profiles for rendering live in the
 * employee store; a save updates both.
 */
export const useAvatarStore = defineStore('avatar', {
  state: (): AvatarStoreState => ({
    employeeId: null,
    ownProfile: null,
    starter: null,
    status: 'idle',
    error: null,
    saving: false,
  }),

  getters: {
    hasAvatar: (state): boolean => state.ownProfile !== null,
  },

  actions: {
    /** Seeds the store from the session response, so first-time routing needs no extra request. */
    prime(employeeId: UUID, profile: AvatarProfile | null): void {
      this.employeeId = employeeId;
      this.ownProfile = profile;
      this.starter = null;
      this.status = 'ready';
      this.error = null;
    },

    /** Loads the current user's profile once per identity (concurrent callers share one request). */
    async ensureLoaded(): Promise<void> {
      const employeeId = useAuthStore().currentEmployeeId;
      if (!employeeId) return;
      if (this.employeeId === employeeId && this.status === 'ready') return;
      inflight ??= this.load(employeeId).finally(() => (inflight = null));
      await inflight;
    },

    async load(employeeId: UUID): Promise<void> {
      this.status = 'loading';
      this.error = null;
      try {
        const repository = await resolveAvatarProfileRepository(runtimeEnv.demoMode);
        const [own, starter] = await Promise.all([repository.getOwn(employeeId), repository.getStarterAppearance(employeeId)]);
        this.employeeId = employeeId;
        this.ownProfile = own;
        this.starter = starter;
        this.status = 'ready';
      } catch (error) {
        this.employeeId = employeeId;
        this.status = 'error';
        this.error = error instanceof Error ? error.message : 'Could not load your avatar';
      }
    },

    async save(appearance: AvatarAppearance): Promise<AvatarProfile> {
      const employeeId = useAuthStore().currentEmployeeId;
      if (!employeeId) throw new Error('Not signed in');
      this.saving = true;
      try {
        const repository = await resolveAvatarProfileRepository(runtimeEnv.demoMode);
        const profile = await repository.save(employeeId, appearance);
        this.employeeId = employeeId;
        this.ownProfile = profile;
        this.status = 'ready';
        // The office picks this up from the employee store and re-skins the avatar in place.
        useEmployeeStore().upsertAvatarProfile(profile);
        return profile;
      } finally {
        this.saving = false;
      }
    },
  },
});
