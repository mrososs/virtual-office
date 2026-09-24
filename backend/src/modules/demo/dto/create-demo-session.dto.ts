import { IsOptional, IsString, Matches, MaxLength } from 'class-validator';

const DEMO_ID_PATTERN = /^[a-z0-9][a-z0-9-]{0,63}$/;

export class CreateDemoSessionDto {
  @IsString()
  @Matches(DEMO_ID_PATTERN)
  employeeId!: string;

  @IsString()
  @Matches(DEMO_ID_PATTERN)
  organizationId!: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  displayName?: string;
}

export class DemoSessionResponseDto {
  accessToken!: string;
  employeeId!: string;
  organizationId!: string;
  expiresIn!: string;
}
