import type { ISODateString, UUID } from '@virtual-office/shared';

export type NotificationKind = 'MEETING' | 'BUILD' | 'PULL_REQUEST' | 'LOCATION' | 'SYSTEM';

export type NotificationTone = 'info' | 'success' | 'warning' | 'danger';

/** What the toast's action button does. Resolved by the notification host, not the producer. */
export type NotificationAction =
  | { kind: 'WALK_TO_ROOM'; label: string; roomId: UUID }
  | { kind: 'OPEN_MEETING'; label: string; meetingId: UUID }
  | { kind: 'OPEN_EMPLOYEE'; label: string; employeeId: UUID };

export interface AppNotification {
  id: string;
  at: ISODateString;
  kind: NotificationKind;
  tone: NotificationTone;
  title: string;
  body?: string;
  action?: NotificationAction;
  read: boolean;
}
