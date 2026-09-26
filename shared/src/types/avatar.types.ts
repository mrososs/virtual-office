import type { ISODateString, UUID } from './common.types.js';

/**
 * What an avatar looks like, as data. Every value is an option id from
 * `AVATAR_CATALOG` (domain/avatar-catalog.ts); renderers build the character
 * layer by layer from these ids, so no pre-rendered image is ever stored.
 *
 * Values coming from storage or the network are untrusted: run them through
 * `normalizeAvatarAppearance`, which replaces anything unknown with a default.
 */
export interface AvatarAppearance {
  bodyType: string;
  skinTone: string;
  hairStyle: string;
  hairColor: string;
  topStyle: string;
  topColor: string;
  bottomStyle: string;
  bottomColor: string;
  shoesStyle: string;
  /** `null` = no accessory. */
  accessory: string | null;
}

/**
 * Someone's saved avatar (one per employee). Flat on purpose so it maps 1:1
 * onto the `avatar_profiles` table (docs/DATABASE_SCHEMA.md). There is no
 * role here: a General Manager and a Developer customize exactly the same way.
 */
export interface AvatarProfile extends AvatarAppearance {
  id: UUID;
  employeeId: UUID;
  updatedAt: ISODateString;
}
