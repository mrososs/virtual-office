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
  TESTING: { label: 'Testing', color: '#84cc16' },
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
  MANAGEMENT: { label: 'General Manager office', color: '#c8a27a' },
  PROJECT_MANAGEMENT: { label: 'Project Manager office', color: '#f472b6' },
  TEAM_LEAD: { label: 'Team Lead area', color: '#a78bfa' },
  DEVELOPMENT: { label: 'Development area', color: '#60a5fa' },
  QA: { label: 'QA area', color: '#34d399' },
  MEETING: { label: 'Meeting room', color: '#818cf8' },
  CODE_REVIEW: { label: 'Code review & collaboration', color: '#fb923c' },
  BREAK: { label: 'Break area', color: '#2dd4bf' },
  GENERAL: { label: 'Common area', color: '#94a3b8' },
};

export function hexToNumber(hex: string): number {
  return Number.parseInt(hex.replace('#', ''), 16);
}
