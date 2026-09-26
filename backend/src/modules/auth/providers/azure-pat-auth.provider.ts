import { Injectable } from '@nestjs/common';
import { DatabaseError } from '../../../common/supabase/database.error';
import { AzurePatError } from '../../azure-devops/azure-pat.errors';
import { AzureDevOpsConnectionService } from '../../azure-devops/azure-devops-connection.service';
import type { AzureIdentityRef } from '../../azure-devops/azure.types';
import { AzureIdentityRepository } from '../../azure-devops/repositories/azure-identity.repository';
import { normalizeEmail, type EmployeeRecord } from '../../employees/employee.record';
import { EmployeeRepository } from '../../employees/employee.repository';
import type { AppSession } from '../../session/session.types';
import { SignInService } from '../sign-in.service';

/**
 * AUTH_PROVIDER=azure_pat — the current sign-in, needing no Microsoft app
 * registration. The PAT proves *who* someone is (Azure DevOps tells us whose
 * token it is); the employees table decides *whether* they may enter.
 *
 *   email + PAT → Azure DevOps connectionData → Azure identity (id + verified email)
 *   → already linked employee, or approved employee with that verified email
 *   → PAT sealed and stored as their Azure DevOps connection
 *   → ordinary application session (HttpOnly cookie) — the PAT is never the session
 *
 * Nobody is created here, and a display name is never used to match anyone.
 */
@Injectable()
export class AzurePatAuthProvider {
  constructor(
    private readonly azureDevOps: AzureDevOpsConnectionService,
    private readonly identities: AzureIdentityRepository,
    private readonly employees: EmployeeRepository,
    private readonly sessions: SignInService,
  ) {}

  async signIn(
    input: { email: string; token: string; expiresOn: string | null },
    userAgent: string | null,
  ): Promise<{ token: string; session: AppSession; employee: EmployeeRecord }> {
    try {
      const identity = await this.azureDevOps.inspectPat(input.token);
      const employee = await this.resolveEmployee(normalizeEmail(input.email), identity);
      // A token without project access still signs the person in; the connection shows "needs attention".
      await this.azureDevOps.savePat(employee, input.token, input.expiresOn, identity);
      return await this.sessions.startSession(employee, { displayName: null, email: null }, userAgent);
    } catch (error) {
      if (error instanceof DatabaseError) throw new AzurePatError('service_unavailable', error.message);
      throw error;
    }
  }

  private async resolveEmployee(typedEmail: string, identity: AzureIdentityRef): Promise<EmployeeRecord> {
    const verifiedEmail = this.azureDevOps.verifiedEmailOf(identity);
    let employee: EmployeeRecord | null;

    const linked = await this.identities.findByIdentityId(identity.id);
    if (linked) {
      // Returning user: the stable Azure identity id decides; the typed email only has to be theirs.
      employee = await this.employees.findById(linked.employeeId);
      if (!employee) throw new AzurePatError('not_authorized', 'linked employee no longer exists');
      if (typedEmail !== employee.email && typedEmail !== verifiedEmail) throw new AzurePatError('email_mismatch', 'typed email is not the linked employee');
    } else {
      // First link: Azure's verified email must be the typed one and an approved employee.
      if (!verifiedEmail) throw new AzurePatError('identity_unverifiable', 'connectionData returned no email');
      if (verifiedEmail !== typedEmail) throw new AzurePatError('email_mismatch', 'token email differs from typed email');
      employee = await this.employees.findByEmail(verifiedEmail);
      if (!employee) throw new AzurePatError('not_authorized', `${verifiedEmail} is not an approved employee`);
      const existing = await this.identities.findByEmployee(employee.id);
      if (existing?.matchMethod === 'VERIFIED_SIGN_IN' && existing.azureIdentityId !== identity.id) {
        throw new AzurePatError('not_authorized', 'employee is linked to a different Azure DevOps account');
      }
    }

    if (!employee.isActive) throw new AzurePatError('account_disabled', `employee ${employee.id} is disabled`);
    return employee;
  }
}
