import { IsEmail, MaxLength } from 'class-validator';
import type { AzurePatLoginRequest } from '@virtual-office/shared';
import { AzureTokenDto } from '../../azure-devops/dto/azure-token.dto';

/** Email + PAT. The token's format is checked here; whose it is, by Azure DevOps. */
export class AzurePatLoginDto extends AzureTokenDto implements AzurePatLoginRequest {
  @IsEmail({}, { message: 'Enter your work email' })
  @MaxLength(254)
  email!: string;
}
