import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { AuthMeResponse } from '@virtual-office/shared';
import { AppConfig } from '../../config/configuration';
import { AvatarProfilesService } from '../avatars/avatar-profiles.service';
import { AzureDevOpsConnectionService } from '../azure-devops/azure-devops-connection.service';
import type { EmployeeRecord } from '../employees/employee.record';
import { EmployeeRepository } from '../employees/employee.repository';
import { EmployeesService } from '../employees/employees.service';
import { ActiveAuthProvider } from '../session/active-auth-provider';
import { SessionService } from '../session/session.service';
import type { AppSession, AuthContext } from '../session/session.types';

/**
 * What happens after *any* provider has proven who someone is (Azure DevOps
 * PAT today, Microsoft Entra later): the sign-in is stamped, the employee gets
 * a desk, and a normal application session starts. Providers only decide
 * *which* approved employee it is; they never create employees.
 */
@Injectable()
export class SignInService {
  private readonly logger = new Logger(SignInService.name);
  private readonly organization: AppConfig['organization'];

  constructor(
    configService: ConfigService,
    private readonly employees: EmployeeRepository,
    private readonly employeesService: EmployeesService,
    private readonly avatars: AvatarProfilesService,
    private readonly azureDevOps: AzureDevOpsConnectionService,
    private readonly sessions: SessionService,
    private readonly provider: ActiveAuthProvider,
  ) {
    this.organization = configService.get<AppConfig>('app')!.organization;
  }

  /** `profile` carries what the provider reports (Entra refreshes name/email; a PAT sign-in keeps the roster's). */
  async startSession(
    employee: EmployeeRecord,
    profile: { displayName: string | null; email: string | null },
    userAgent: string | null,
  ): Promise<{ token: string; session: AppSession; employee: EmployeeRecord }> {
    let current = await this.employees.recordSignIn(employee.id, profile);
    current = await this.employeesService.ensureDesk(current);
    const { token, session } = await this.sessions.start(current.id, userAgent);
    this.logger.log(`Employee ${current.id} signed in (${this.provider.id})`);
    return { token, session, employee: current };
  }

  async describe(auth: AuthContext): Promise<AuthMeResponse> {
    const { employee, session } = auth;
    const [avatar, azureDevOps] = await Promise.all([this.avatars.getForEmployee(employee.id), this.azureDevOps.statusFor(employee.id)]);
    return {
      employee: {
        id: employee.id,
        displayName: employee.displayName,
        email: employee.email,
        role: employee.role,
        jobTitle: employee.jobTitle,
        team: employee.team,
        discipline: employee.discipline,
        avatar,
        assignedDeskId: employee.assignedDeskId,
      },
      organization: { id: this.organization.id, name: this.organization.name },
      session: { expiresAt: session.expiresAt, provider: this.provider.id },
      integrations: { azureDevOps },
    };
  }
}
