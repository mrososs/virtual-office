import { Bell, CalendarDays, GitPullRequest, Hammer, MapPin, type LucideIcon } from 'lucide-vue-next';

import type { NotificationKind, NotificationTone } from './notification.types';

export const NOTIFICATION_ICONS: Record<NotificationKind, LucideIcon> = {
  MEETING: CalendarDays,
  BUILD: Hammer,
  PULL_REQUEST: GitPullRequest,
  LOCATION: MapPin,
  SYSTEM: Bell,
};

export const TONE_COLORS: Record<NotificationTone, string> = {
  info: '#7c83ff',
  success: '#22c55e',
  warning: '#f59e0b',
  danger: '#ef4444',
};
