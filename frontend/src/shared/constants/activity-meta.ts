import type { ActivityType, MeetingStatus, PresenceStatus, RoomType } from '@virtual-office/shared';

/**
 * Display metadata for domain enums. Framework-free so both Vue components
 * and the Phaser layer render the same labels and colors.
 */
export interface StatusMeta {
  label: string;
  color: string;
}

export const ACTIVITY_META: Record<ActivityType, StatusMeta> = {
  AVAILABLE: { label: 'Available', color: '#22c55e' },
  WORKING: { label: 'Working', color: '#10b981' },
  CODING: { label: 'Coding', color: '#06b6d4' },
  CODE_REVIEW: { label: 'Reviewing', color: '#f97316' },
  BUILDING: { label: 'Building', color: '#eab308' },
  BLOCKED: { label: 'Blocked', color: '#ef4444' },
  MEETING: { label: 'In a meeting', color: '#3b82f6' },
  FOCUS: { label: 'Focusing', color: '#8b5cf6' },
  BREAK: { label: 'On a break', color: '#ec4899' },
  OFFLINE: { label: 'Offline', color: '#6b7280' },
  UNKNOWN: { label: 'Unknown', color: '#94a3b8' },
};

export const PRESENCE_META: Record<PresenceStatus, StatusMeta> = {
  ONLINE: { label: 'Online', color: '#22c55e' },
  AWAY: { label: 'Away', color: '#f59e0b' },
  OFFLINE: { label: 'Offline', color: '#6b7280' },
};

export const MEETING_STATUS_META: Record<MeetingStatus, StatusMeta> = {
  SCHEDULED: { label: 'Scheduled', color: '#94a3b8' },
  STARTING_SOON: { label: 'Starting soon', color: '#f59e0b' },
  LIVE: { label: 'Live', color: '#ef4444' },
  ENDED: { label: 'Ended', color: '#6b7280' },
  CANCELLED: { label: 'Cancelled', color: '#6b7280' },
};

export const ROOM_TYPE_META: Record<RoomType, StatusMeta> = {
  DEVELOPMENT: { label: 'Development area', color: '#60a5fa' },
  DESIGN: { label: 'Design studio', color: '#f472b6' },
  QA: { label: 'QA lab', color: '#34d399' },
  CODE_REVIEW: { label: 'Code review', color: '#fb923c' },
  MEETING: { label: 'Meeting room', color: '#818cf8' },
  MANAGER: { label: 'Private office', color: '#a8a29e' },
  FOCUS: { label: 'Quiet room', color: '#a78bfa' },
  GAME: { label: 'Game room', color: '#2dd4bf' },
  KITCHEN: { label: 'Kitchen', color: '#fbbf24' },
  LOUNGE: { label: 'Lounge', color: '#fbbf24' },
  GENERAL: { label: 'Common area', color: '#94a3b8' },
};

export function hexToNumber(hex: string): number {
  return Number.parseInt(hex.replace('#', ''), 16);
}
