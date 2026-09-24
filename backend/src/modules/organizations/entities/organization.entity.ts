import type { UUID, ISODateString } from '@virtual-office/shared';

/** The tenant/company boundary — every other domain record hangs off one of these. */
export interface Organization {
  id: UUID;
  name: string;
  slug: string;
  createdAt: ISODateString;
}
