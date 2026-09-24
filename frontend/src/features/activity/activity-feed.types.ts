import type { ISODateString, UUID } from '@virtual-office/shared';

export type FeedItemKind = 'WORK_ITEM' | 'PULL_REQUEST' | 'BUILD' | 'MEETING' | 'PRESENCE' | 'LOCATION';

export type FeedTone = 'neutral' | 'info' | 'success' | 'warning' | 'danger';

/**
 * One line in the office activity feed. `actorEmployeeId` is rendered as the
 * sentence subject ("Omar started reviewing PR #493"); system events have none.
 */
export interface FeedItem {
  id: string;
  at: ISODateString;
  kind: FeedItemKind;
  tone: FeedTone;
  actorEmployeeId: UUID | null;
  text: string;
  meetingId?: UUID;
}
