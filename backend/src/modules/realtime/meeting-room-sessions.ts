import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { checkTeamsMeetingUrl, sanitizeMeetingTitle, type MeetingRoomErrorCode, type MeetingRoomSession, type UUID } from '@virtual-office/shared';

/** A room's Teams link is forgotten after this long even if nobody ends it (links are per meeting, not per room). */
export const MEETING_ROOM_SESSION_TTL_MS = 12 * 60 * 60_000;

export class MeetingRoomError extends Error {
  constructor(
    readonly code: MeetingRoomErrorCode,
    message: string,
  ) {
    super(message);
  }
}

interface StoredSession {
  session: MeetingRoomSession;
  expiryTimer: NodeJS.Timeout;
}

/**
 * Teams meetings attached to Virtual Office meeting rooms: a title and a
 * pasted join link, validated against the Microsoft Teams allowlist before it
 * is stored. No Microsoft Graph: the office never creates, reads or joins a
 * meeting itself. In memory (single backend instance, like presence); a
 * redeploy clears the rooms and people paste the link again.
 */
@Injectable()
export class MeetingRoomSessions implements OnModuleDestroy {
  private readonly sessions = new Map<string, StoredSession>();
  private onExpired: ((officeId: UUID, roomId: UUID) => void) | null = null;

  /** Called when a session times out, so the gateway can tell the office. */
  setExpiryListener(listener: (officeId: UUID, roomId: UUID) => void): void {
    this.onExpired = listener;
  }

  onModuleDestroy(): void {
    for (const stored of this.sessions.values()) clearTimeout(stored.expiryTimer);
    this.sessions.clear();
  }

  all(officeId: UUID): MeetingRoomSession[] {
    const prefix = `${officeId}\u0000`;
    return [...this.sessions.entries()].filter(([key]) => key.startsWith(prefix)).map(([, stored]) => stored.session);
  }

  get(officeId: UUID, roomId: UUID): MeetingRoomSession | null {
    return this.sessions.get(key(officeId, roomId))?.session ?? null;
  }

  /** Creates or replaces the room's session. The caller has checked who may do this. */
  set(officeId: UUID, roomId: UUID, employeeId: UUID, title: unknown, joinUrl: unknown): MeetingRoomSession {
    const cleanTitle = sanitizeMeetingTitle(title);
    if (!cleanTitle) throw new MeetingRoomError('INVALID_TITLE', 'Give the meeting a short title (up to 80 characters).');
    const link = checkTeamsMeetingUrl(joinUrl);
    if (!link.ok) throw new MeetingRoomError('INVALID_LINK', link.reason);

    const existing = this.sessions.get(key(officeId, roomId));
    if (existing) clearTimeout(existing.expiryTimer);
    const now = new Date().toISOString();
    const session: MeetingRoomSession = {
      roomId,
      title: cleanTitle,
      teamsJoinUrl: link.url,
      createdBy: existing?.session.createdBy ?? employeeId,
      createdAt: existing?.session.createdAt ?? now,
      updatedAt: now,
    };
    const expiryTimer = setTimeout(() => {
      this.sessions.delete(key(officeId, roomId));
      this.onExpired?.(officeId, roomId);
    }, MEETING_ROOM_SESSION_TTL_MS);
    expiryTimer.unref();
    this.sessions.set(key(officeId, roomId), { session, expiryTimer });
    return session;
  }

  /** Returns false when the room had no session. */
  clear(officeId: UUID, roomId: UUID): boolean {
    const stored = this.sessions.get(key(officeId, roomId));
    if (!stored) return false;
    clearTimeout(stored.expiryTimer);
    this.sessions.delete(key(officeId, roomId));
    return true;
  }
}

function key(officeId: UUID, roomId: UUID): string {
  return `${officeId}\u0000${roomId}`;
}
