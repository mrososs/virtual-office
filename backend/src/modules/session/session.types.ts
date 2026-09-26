import type { ISODateString, UUID } from '@virtual-office/shared';
import type { Request } from 'express';
import type { EmployeeRecord } from '../employees/employee.record';

export interface AppSession {
  id: UUID;
  employeeId: UUID;
  createdAt: ISODateString;
  lastSeenAt: ISODateString;
  /** Absolute end of the session; the idle timeout may end it sooner. */
  expiresAt: ISODateString;
}

/** Who is calling: attached to the request by `SessionAuthGuard`. */
export interface AuthContext {
  session: AppSession;
  employee: EmployeeRecord;
}

export type SessionEndReason = 'SIGNED_OUT' | 'EXPIRED' | 'DISABLED';

export interface SessionEndedEvent {
  sessionId: UUID;
  employeeId: UUID;
  reason: SessionEndReason;
}

export type AuthenticatedRequest = Request & { auth?: AuthContext };
