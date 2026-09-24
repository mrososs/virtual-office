import type { ISODateString } from '@virtual-office/shared';

/** Current time as the `ISODateString` shape used throughout shared domain types. */
export function nowIso(): ISODateString {
  return new Date().toISOString();
}

/** Whether an ISO timestamp is in the past relative to now (or a supplied reference). */
export function isPast(value: ISODateString, reference: Date = new Date()): boolean {
  return new Date(value).getTime() < reference.getTime();
}

/** Minutes between two ISO timestamps (`b - a`), useful for "starting soon" windows. */
export function diffInMinutes(a: ISODateString, b: ISODateString): number {
  return (new Date(b).getTime() - new Date(a).getTime()) / 60_000;
}

/** Adds a number of minutes to an ISO timestamp, returning a new ISO string. */
export function addMinutes(value: ISODateString, minutes: number): ISODateString {
  return new Date(new Date(value).getTime() + minutes * 60_000).toISOString();
}
