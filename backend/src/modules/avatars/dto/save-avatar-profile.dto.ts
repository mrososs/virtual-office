import { IsOptional, IsString, MaxLength, ValidateIf } from 'class-validator';
import type { AvatarAppearance } from '@virtual-office/shared';

/** Shape check only; `AvatarProfilesService` then checks every value against AVATAR_CATALOG. */
export class SaveAvatarProfileDto implements AvatarAppearance {
  @IsString() @MaxLength(64) bodyType!: string;
  @IsString() @MaxLength(64) skinTone!: string;
  @IsString() @MaxLength(64) hairStyle!: string;
  @IsString() @MaxLength(64) hairColor!: string;
  @IsString() @MaxLength(64) topStyle!: string;
  @IsString() @MaxLength(64) topColor!: string;
  @IsString() @MaxLength(64) bottomStyle!: string;
  @IsString() @MaxLength(64) bottomColor!: string;
  @IsString() @MaxLength(64) shoesStyle!: string;

  @IsOptional()
  @ValidateIf((_dto, value) => value !== null)
  @IsString()
  @MaxLength(64)
  accessory!: string | null;
}
