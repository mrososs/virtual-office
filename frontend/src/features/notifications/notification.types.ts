import type { ISODateString, UUID } from '@virtual-office/shared';

export type NotificationKind = 'MEETING' | 'BUILD' | 'PULL_REQUEST' | 'LOCATION' | 'GAME' | 'SYSTEM';

/**
 * Optional chime. Producers set it only for changes that matter to this
 * person (a review requested from them, a failed build) — never for routine
 * syncs; the SoundManager also throttles repeats.
 */
export type NotificationSound = 'NOTIFY' | 'ALERT' | 'SUCCESS';

export type NotificationTone = 'info' | 'success' | 'warning' | 'danger';

/** What the toast's action button does. Resolved by the notification host, not the producer. */
export type NotificationAction =
  | { kind: 'WALK_TO_ROOM'; label: string; roomId: UUID }
  | { kind: 'OPEN_MEETING'; label: string; meetingId: UUID }
  | { kind: 'OPEN_EMPLOYEE'; label: string; employeeId: UUID }
  /** Opens a Teams group call with whoever is in that room at click time (server occupancy). */
  | { kind: 'TEAMS_GROUP_CALL'; label: string; roomId: UUID };

export interface AppNotification {
  id: string;
  at: ISODateString;
  kind: NotificationKind;
  tone: NotificationTone;
  title: string;
  body?: string;
  action?: NotificationAction;
  sound?: NotificationSound;
  read: boolean;
}
