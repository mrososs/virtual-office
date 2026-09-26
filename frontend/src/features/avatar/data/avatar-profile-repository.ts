import { AVATAR_SLOTS, type AvatarAppearance, type AvatarProfile, type UUID } from '@virtual-office/shared';

import { httpClient } from '@/core/api';

/**
 * Persistence boundary for avatar profiles. Production is backed by the API
 * (the `avatar_profiles` table, see docs/DATABASE_SCHEMA.md); demo mode uses
 * seeded looks plus saves kept in this browser. Nothing else in the app knows
 * which implementation is active.
 */
export interface AvatarProfileRepository {
  readonly kind: 'demo' | 'api';
  /** The employee's saved profile, or null when they never created one (first-time setup). */
  getOwn(employeeId: UUID): Promise<AvatarProfile | null>;
  /** A sensible starting look for the avatar creator when no profile exists yet. */
  getStarterAppearance(employeeId: UUID): Promise<AvatarAppearance | null>;
  save(employeeId: UUID, appearance: AvatarAppearance): Promise<AvatarProfile>;
}

/** The server owns the "whose avatar" question (the session), so employee ids are never sent. */
const apiAvatarProfileRepository: AvatarProfileRepository = {
  kind: 'api',
  async getOwn() {
    const { profile } = await httpClient.get<{ profile: AvatarProfile | null }>('/avatar-profiles/me');
    return profile;
  },
  async getStarterAppearance() {
    return null;
  },
  async save(_employeeId, appearance) {
    // Only the catalog slots: the API rejects unknown fields and validates every value against AVATAR_CATALOG.
    const body = Object.fromEntries(AVATAR_SLOTS.map((slot) => [slot, appearance[slot] ?? null]));
    return httpClient.put<AvatarProfile>('/avatar-profiles/me', body);
  },
};

/** Demo persistence is imported lazily so it never ships in a non-demo build's main chunk. */
export async function resolveAvatarProfileRepository(demoMode: boolean): Promise<AvatarProfileRepository> {
  if (!demoMode) return apiAvatarProfileRepository;
  const { demoAvatarProfileRepository } = await import('@/demo/demo-avatar-profile.repository');
  return demoAvatarProfileRepository;
}
