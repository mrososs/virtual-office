import type { UUID } from './common.types.js';

export interface Team {
  id: UUID;
  organizationId: UUID;
  name: string;
  managerEmployeeId: UUID | null;
}
