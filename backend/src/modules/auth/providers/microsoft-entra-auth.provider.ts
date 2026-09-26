import { Injectable, Logger } from '@nestjs/common';
import { DatabaseError } from '../../../common/supabase/database.error';
import type { EmployeeRecord } from '../../employees/employee.record';
import { EmployeeRepository } from '../../employees/employee.repository';
import type { EntraFlowResult, EntraIdentity } from '../../entra/entra-auth-code-flow.service';
import { EntraFlowError } from '../../entra/entra.errors';
import { MicrosoftTokenService } from '../../entra/microsoft-token.service';
import type { AppSession } from '../../session/session.types';
import { SignInService } from '../sign-in.service';

/**
 * AUTH_PROVIDER=microsoft_entra — INACTIVE until iSaned IT approves an Entra
 * app registration (see docs/MICROSOFT_AUTH_SETUP.md). Turns a verified
 * Microsoft identity into a session for pre-approved employees only:
 *
 *  1. (tenant, object id) already linked → that employee
 *  2. otherwise the Microsoft email must match an unlinked employee row →
 *     link it (first sign-in); the stable Entra ids are used from then on
 *  3. no match, already linked to someone else, or disabled → rejected
 */
@Injectable()
export class MicrosoftEntraAuthProvider {
  private readonly logger = new Logger(MicrosoftEntraAuthProvider.name);

  constructor(
    private readonly employees: EmployeeRepository,
    private readonly tokens: MicrosoftTokenService,
    private readonly signIn: SignInService,
  ) {}

  async signInWith(result: EntraFlowResult, userAgent: string | null): Promise<{ token: string; session: AppSession }> {
    try {
      const employee = await this.resolveEmployee(result.identity);
      const started = await this.signIn.startSession(employee, { displayName: result.identity.displayName, email: result.identity.email }, userAgent);
      await this.tokens.storeCache(employee.id, result.tokenCache.homeAccountId, result.tokenCache.serialized);
      return { token: started.token, session: started.session };
    } catch (error) {
      if (error instanceof DatabaseError) throw new EntraFlowError('service_unavailable', error.message);
      throw error;
    }
  }

  private async resolveEmployee(identity: EntraIdentity): Promise<EmployeeRecord> {
    const linked = await this.employees.findByEntraIdentity(identity.tenantId, identity.objectId);
    if (linked) return this.assertActive(linked);

    if (!identity.email) throw new EntraFlowError('not_authorized', 'Microsoft account has no email/UPN to match');
    const candidate = await this.employees.findByEmail(identity.email);
    if (!candidate) throw new EntraFlowError('not_authorized', `${identity.email} is not an approved employee`);
    if (candidate.entraObjectId) {
      // The approved email already belongs to a different Microsoft account: never silently re-link.
      this.logger.warn(`Refused sign-in: employee ${candidate.id} is linked to another Microsoft account`);
      throw new EntraFlowError('not_authorized', 'employee linked to a different Microsoft account');
    }
    this.assertActive(candidate);

    const newlyLinked = await this.employees.linkEntraIdentity(candidate.id, identity.tenantId, identity.objectId);
    if (newlyLinked) {
      this.logger.log(`Linked employee ${candidate.id} to Microsoft object ${identity.objectId}`);
      return newlyLinked;
    }
    // Lost a race with a concurrent first sign-in: fine if it was the same Microsoft account.
    const raced = await this.employees.findByEntraIdentity(identity.tenantId, identity.objectId);
    if (raced) return this.assertActive(raced);
    throw new EntraFlowError('not_authorized', 'employee was linked to another Microsoft account meanwhile');
  }

  private assertActive(employee: EmployeeRecord): EmployeeRecord {
    if (!employee.isActive) throw new EntraFlowError('account_disabled', `employee ${employee.id} is disabled`);
    return employee;
  }
}
