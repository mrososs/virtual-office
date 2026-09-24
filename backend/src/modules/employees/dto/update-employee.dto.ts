import { IsOptional, IsString, IsUUID } from 'class-validator';
import type { UUID } from '@virtual-office/shared';

export class UpdateEmployeeDto {
  @IsOptional()
  @IsString()
  displayName?: string;

  @IsOptional()
  @IsString()
  avatarUrl?: string;

  @IsOptional()
  @IsString()
  jobTitle?: string;

  @IsOptional()
  @IsUUID()
  teamId?: UUID;
}
