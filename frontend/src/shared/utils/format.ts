import type { ISODateString } from '@virtual-office/shared';

const timeFormatter = new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' });
const clockFormatter = new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit', hour12: false });

export function formatRelativeTime(iso: ISODateString | null, now: number = Date.now()): string {
  if (!iso) return 'never';
  const deltaMs = now - new Date(iso).getTime();
  const minutes = Math.round(deltaMs / 60_000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  return hours < 24 ? `${hours} h ago` : `${Math.round(hours / 24)} d ago`;
}

export function formatTime(iso: ISODateString): string {
  return timeFormatter.format(new Date(iso));
}

/** 24h "HH:mm" — compact timestamps for feeds. */
export function formatClock(iso: ISODateString): string {
  return clockFormatter.format(new Date(iso));
}

export function formatTimeRange(startIso: ISODateString, endIso: ISODateString): string {
  return `${formatTime(startIso)} – ${formatTime(endIso)}`;
}

export function formatDurationMinutes(startIso: ISODateString, endIso: ISODateString): string {
  const minutes = Math.round((new Date(endIso).getTime() - new Date(startIso).getTime()) / 60_000);
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest === 0 ? `${hours} h` : `${hours} h ${rest} min`;
}

/** "in 25s", "in 4 min", "now" — for meetings that are about to start. */
export function formatCountdown(targetIso: ISODateString, now: number = Date.now()): string {
  const seconds = Math.round((new Date(targetIso).getTime() - now) / 1000);
  if (seconds <= 0) return 'now';
  if (seconds < 60) return `in ${seconds}s`;
  const minutes = Math.round(seconds / 60);
  return minutes < 60 ? `in ${minutes} min` : `in ${Math.round(minutes / 60)} h`;
}

export function truncate(text: string, maxLength: number): string {
  return text.length > maxLength ? `${text.slice(0, maxLength - 1)}…` : text;
}

export function pluralize(count: number, singular: string, plural = `${singular}s`): string {
  return `${count} ${count === 1 ? singular : plural}`;
}
