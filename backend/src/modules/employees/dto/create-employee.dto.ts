import { IsOptional, IsString, IsUUID } from 'class-validator';
import type { UUID } from '@virtual-office/shared';

/**
 * Request DTO for provisioning a new employee. Composes the fields of the
 * shared `Employee` type that make sense to accept from a client — presence,
 * activity, and position are server-derived and never set directly here.
 */
export class CreateEmployeeDto {
  @IsUUID()
  organizationId!: UUID;

  @IsString()
  displayName!: string;

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
