import {
  normalizeAvatarAppearance,
  normalizeAvatarProfile,
  type AvatarAppearance,
  type AvatarProfile,
  type UUID,
} from '@virtual-office/shared';

import type { AvatarProfileRepository } from '@/features/avatar/data/avatar-profile-repository';

import { DEMO_AVATAR_LOOKS } from './employees.demo';

/**
 * Demo-only persistence: avatars saved in this browser live in localStorage
 * (shared by every tab, so another demo identity in a second tab sees your
 * saved look). This exists because demo mode has no database; production
 * reads and writes the `avatar_profiles` table through the API instead.
 */
const STORAGE_KEY = 'vo:demo-avatar-profiles:v1';

function readSaved(): Record<UUID, AvatarProfile> {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : {};
    if (typeof parsed !== 'object' || parsed === null) return {};
    // Stored data is untrusted (older versions, manual edits): normalize every entry.
    return Object.fromEntries(Object.entries(parsed).map(([employeeId, value]) => [employeeId, normalizeAvatarProfile(value, employeeId)]));
  } catch {
    return {};
  }
}

function writeSaved(profiles: Record<UUID, AvatarProfile>): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(profiles));
  } catch {
    // Storage can be unavailable (privacy mode): the save still applies to this session.
  }
}

function seededProfile(employeeId: UUID, appearance: AvatarAppearance, now: string): AvatarProfile {
  return { ...normalizeAvatarAppearance(appearance), id: `avatar-${employeeId}`, employeeId, updatedAt: now };
}

/** Everyone's profile for the demo snapshot: the seeded team looks, with looks saved in this browser on top. */
export function createDemoAvatarProfiles(now: number): AvatarProfile[] {
  const iso = new Date(now).toISOString();
  const saved = readSaved();
  const seeded = Object.entries(DEMO_AVATAR_LOOKS).map(([employeeId, look]) => saved[employeeId] ?? seededProfile(employeeId, look, iso));
  const extra = Object.values(saved).filter((profile) => !(profile.employeeId in DEMO_AVATAR_LOOKS));
  return [...seeded, ...extra];
}

export const demoAvatarProfileRepository: AvatarProfileRepository = {
  kind: 'demo',

  // Seeded looks stand in for teammates who already set up their avatar; *your*
  // profile only exists once you saved one in this browser, so the first visit
  // as any demo identity goes through the avatar creator.
  async getOwn(employeeId) {
    return readSaved()[employeeId] ?? null;
  },

  async getStarterAppearance(employeeId) {
    const look = DEMO_AVATAR_LOOKS[employeeId];
    return look ? normalizeAvatarAppearance(look) : null;
  },

  async save(employeeId, appearance) {
    const profile = seededProfile(employeeId, appearance, new Date().toISOString());
    writeSaved({ ...readSaved(), [employeeId]: profile });
    return profile;
  },
};
