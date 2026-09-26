import { AVATAR_CATALOG, isAvatarColorSlot, type AvatarColorOption, type AvatarOption, type AvatarSlot } from '@virtual-office/shared';

/** Which part of the avatar an option card previews. */
export type ThumbCrop = 'full' | 'head' | 'bust' | 'torso' | 'legs' | 'feet';

export interface CreatorOption {
  /** `null` is the "none" choice (accessory only). */
  id: string | null;
  label: string;
  hex?: string;
}

export interface CreatorGroup {
  slot: AvatarSlot;
  label: string;
  kind: 'card' | 'swatch';
  crop: ThumbCrop;
  options: CreatorOption[];
}

export interface CreatorSection {
  id: string;
  title: string;
  groups: CreatorGroup[];
}

/** How the creator lays out the catalog. Options always come from AVATAR_CATALOG — never listed here. */
function group(slot: AvatarSlot, label: string, crop: ThumbCrop, extra: CreatorOption[] = []): CreatorGroup {
  const options: readonly AvatarOption[] = AVATAR_CATALOG[slot];
  return {
    slot,
    label,
    kind: isAvatarColorSlot(slot) ? 'swatch' : 'card',
    crop,
    options: [...extra, ...options.map((option) => ({ id: option.id, label: option.label, hex: (option as AvatarColorOption).hex }))],
  };
}

export const AVATAR_CREATOR_SECTIONS: readonly CreatorSection[] = [
  { id: 'body', title: 'Body', groups: [group('bodyType', 'Body type', 'full'), group('skinTone', 'Skin tone', 'head')] },
  { id: 'hair', title: 'Hair', groups: [group('hairStyle', 'Hair style', 'head'), group('hairColor', 'Hair color', 'head')] },
  { id: 'top', title: 'Top', groups: [group('topStyle', 'Top', 'torso'), group('topColor', 'Top color', 'torso')] },
  { id: 'bottom', title: 'Bottom', groups: [group('bottomStyle', 'Bottom', 'legs'), group('bottomColor', 'Bottom color', 'legs')] },
  { id: 'shoes', title: 'Shoes', groups: [group('shoesStyle', 'Shoes', 'feet')] },
  { id: 'accessory', title: 'Accessory', groups: [group('accessory', 'Accessory', 'bust', [{ id: null, label: 'None' }])] },
];
