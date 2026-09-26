import { Module } from '@nestjs/common';
import { AvatarsModule } from '../avatars/avatars.module';
import { AzureDevOpsModule } from '../azure-devops/azure-devops.module';
import { EmployeesModule } from '../employees/employees.module';
import { EntraModule } from '../entra/entra.module';
import { AuthController } from './auth.controller';
import { AzurePatAuthController } from './azure-pat-auth.controller';
import { MicrosoftEntraAuthController } from './microsoft-entra-auth.controller';
import { AzurePatAuthProvider } from './providers/azure-pat-auth.provider';
import { MicrosoftEntraAuthProvider } from './providers/microsoft-entra-auth.provider';
import { SignInService } from './sign-in.service';

/**
 * Sign-in for pre-approved employees → application session. One provider is
 * active (AUTH_PROVIDER): `azure_pat` today, `microsoft_entra` once IT approves
 * an app registration. Both hand an approved employee to `SignInService`;
 * nothing after that point knows which provider was used.
 */
@Module({
  imports: [EntraModule, EmployeesModule, AvatarsModule, AzureDevOpsModule],
  controllers: [AuthController, AzurePatAuthController, MicrosoftEntraAuthController],
  providers: [SignInService, AzurePatAuthProvider, MicrosoftEntraAuthProvider],
})
export class AuthModule {}
