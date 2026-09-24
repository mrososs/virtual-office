import type { Employee, UUID } from '@virtual-office/shared';

export interface AuthSession {
  token: string;
  expiresAt: string;
  employee: Employee;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface CurrentUser {
  employeeId: UUID;
  organizationId: UUID;
  displayName: string;
  email: string;
}
