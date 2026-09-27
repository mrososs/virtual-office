import { checkAllowlistedUrl, type AllowlistedUrlRules, type SafeLinkCheck } from './safe-links.js';

/**
 * Microsoft Teams, without Microsoft Graph or an app registration: official
 * Teams deep links built from each employee's work email (their Teams
 * sign-in name). Teams itself asks for confirmation before placing a call
 * and never sends a pre-filled chat message on its own. No tokens, secrets or
 * passwords are involved, and nothing here is Teams presence.
 *
 * Formats: learn.microsoft.com/microsoftteams/platform/concepts/build-and-test/deep-link-workflow
 * (chat, audio call, meeting scheduling). Deliberately no video call.
 */
const TEAMS_LINKS = 'https://teams.microsoft.com/l';
/** Teams takes at most this many people in one deep link; larger rooms get a meeting instead. */
export const TEAMS_MAX_LINK_PARTICIPANTS = 20;

const WORK_EMAIL = /^[A-Za-z0-9._%+'-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}$/;

/**
 * The Teams identity of an employee: their work email. `teamsUpn` is a
 * reserved override for a future employee whose Microsoft sign-in differs
 * from their work email — no one has one today and nothing asks for it.
 * Null when there is no valid address (Teams actions stay unavailable).
 */
export function teamsIdentityOf(employee: { email?: string | null; teamsUpn?: string | null }): string | null {
  const candidate = (employee.teamsUpn ?? employee.email ?? '').trim().toLowerCase();
  return WORK_EMAIL.test(candidate) && candidate.length <= 254 ? candidate : null;
}

/** Percent-encodes like Teams' own examples: spaces as %20 (never "+"), "@" kept readable. */
function encode(value: string): string {
  return encodeURIComponent(value).replace(/%40/g, '@');
}

/** Unique, valid identities as a comma-separated `users` / `attendees` value (null when none remain). */
function people(identities: readonly string[]): string | null {
  const unique = [...new Set(identities.map((identity) => identity.trim().toLowerCase()).filter((identity) => WORK_EMAIL.test(identity)))];
  return unique.length > 0 ? unique.slice(0, TEAMS_MAX_LINK_PARTICIPANTS).map(encode).join(',') : null;
}

function query(params: Record<string, string | null | undefined>): string {
  return Object.entries(params)
    .filter((entry): entry is [string, string] => typeof entry[1] === 'string' && entry[1].length > 0)
    .map(([key, value]) => `${key}=${key === 'users' || key === 'attendees' ? value : encode(value)}`)
    .join('&');
}

/** A Teams chat with one or more people. `message` is only placed in the compose box — Teams never sends it by itself. */
export function createChatLink(identities: readonly string[], options: { topicName?: string; message?: string } = {}): string | null {
  const users = people(identities);
  if (!users) return null;
  const topicName = identities.length >= 2 ? options.topicName : undefined;
  return `${TEAMS_LINKS}/chat/0/0?${query({ users, topicName, message: options.message })}`;
}

/** A normal Teams audio call with one person. Teams confirms before calling; the camera is never requested. */
export function createCallLink(identity: string): string | null {
  const users = people([identity]);
  return users ? `${TEAMS_LINKS}/call/0/0?${query({ users })}` : null;
}

/** A Teams audio group call with everyone listed (the caller is added by Teams, so leave them out). */
export function createGroupCallLink(identities: readonly string[]): string | null {
  const users = people(identities);
  return users ? `${TEAMS_LINKS}/call/0/0?${query({ users })}` : null;
}

/** ISO 8601 with the local UTC offset ("2026-09-27T15:30:00+03:00"), as Teams scheduling requires. */
export function toTeamsDateTime(date: Date): string {
  const pad = (value: number) => String(Math.trunc(Math.abs(value))).padStart(2, '0');
  const offset = -date.getTimezoneOffset();
  const sign = offset >= 0 ? '+' : '-';
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}${sign}${pad(offset / 60)}:${pad(offset % 60)}`;
}

/**
 * Opens Teams' own "new meeting" form, pre-filled. Teams creates the meeting;
 * without Microsoft Graph the office can't read its join link back, so the
 * organizer pastes it into the room afterwards.
 */
export function createMeetingScheduleLink(options: { subject?: string; attendees?: readonly string[]; start?: Date; end?: Date; content?: string }): string {
  return `${TEAMS_LINKS}/meeting/new?${query({
    subject: options.subject?.trim() || undefined,
    attendees: options.attendees ? (people(options.attendees) ?? undefined) : undefined,
    startTime: options.start ? toTeamsDateTime(options.start) : undefined,
    endTime: options.end ? toTeamsDateTime(options.end) : undefined,
    content: options.content?.trim() || undefined,
  })}`;
}

/** Hosts that serve Microsoft Teams meeting join pages. */
export const TEAMS_MEETING_HOSTS = ['teams.microsoft.com', 'teams.live.com', 'teams.cloud.microsoft'] as const;

const TEAMS_MEETING_RULES: AllowlistedUrlRules = {
  label: 'Microsoft Teams meeting',
  allowedHosts: TEAMS_MEETING_HOSTS,
  paths: [
    // Classic: /l/meetup-join/19:meeting_<id>@thread.v2/0
    /^\/l\/meetup-join\/19(?:%3[aA]|:)meeting_[A-Za-z0-9_-]{8,200}(?:%40|@)thread\.v2\/\d{1,3}$/,
    // Short (2024+): /meet/<meeting id>
    /^\/meet\/\d{6,20}$/,
  ],
  allowedQuery: {
    context: /^\{"Tid":"[0-9A-Fa-f-]{36}"(?:,"[A-Za-z]{1,20}":"[0-9A-Za-z-]{1,64}")*\}$/,
    p: /^[A-Za-z0-9]{4,64}$/,
  },
  hostHint: (host) =>
    host.endsWith('safelinks.protection.outlook.com')
      ? 'That is an Outlook Safe Links wrapper. Copy the original Teams meeting link instead.'
      : 'Only Microsoft Teams meeting links (teams.microsoft.com) work here.',
};

/** Validates and normalizes a Teams meeting join link (used by the server before storing it). */
export function checkTeamsMeetingUrl(input: unknown): SafeLinkCheck {
  return checkAllowlistedUrl(TEAMS_MEETING_RULES, input);
}

/** Meeting titles shown on a room: plain text, 1–80 characters, no control characters. */
export function sanitizeMeetingTitle(input: unknown): string | null {
  if (typeof input !== 'string') return null;
  const title = input.replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim();
  return title.length >= 1 && title.length <= 80 ? title : null;
}
