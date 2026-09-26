import { BadRequestException, Injectable } from '@nestjs/common';
import { AVATAR_SLOTS, findAvatarOption, type AvatarAppearance, type AvatarProfile, type UUID } from '@virtual-office/shared';
import { AvatarProfileRepository } from './avatar-profile.repository';

@Injectable()
export class AvatarProfilesService {
  constructor(private readonly profiles: AvatarProfileRepository) {}

  getForEmployee(employeeId: UUID): Promise<AvatarProfile | null> {
    return this.profiles.findByEmployeeId(employeeId);
  }

  listAll(): Promise<AvatarProfile[]> {
    return this.profiles.listAll();
  }

  /** Rejects (rather than silently fixes) values the catalog does not know, so a buggy client is visible. */
  save(employeeId: UUID, input: AvatarAppearance): Promise<AvatarProfile> {
    const appearance = { ...input, accessory: input.accessory ?? null };
    const invalid = AVATAR_SLOTS.filter((slot) => {
      const value = appearance[slot];
      return slot === 'accessory' && value === null ? false : !findAvatarOption(slot, value);
    });
    if (invalid.length > 0) {
      throw new BadRequestException({ code: 'invalid_avatar', message: `Unknown avatar options: ${invalid.join(', ')}` });
    }
    return this.profiles.upsert(employeeId, appearance);
  }
}
