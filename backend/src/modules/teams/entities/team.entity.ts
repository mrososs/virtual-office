import type { UUID } from '@virtual-office/shared';

/** A sub-organizational grouping of employees (e.g. "Platform", "Mobile"). */
export interface Team {
  id: UUID;
  organizationId: UUID;
  name: string;
  managerEmployeeId: UUID | null;
}
