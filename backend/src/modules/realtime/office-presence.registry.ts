import { Injectable } from '@nestjs/common';
import type { AvatarProfile, Direction, UUID, Vector2 } from '@virtual-office/shared';

export interface OfficeMember {
  employeeId: UUID;
  /** Every open connection (tab/device) of this employee in the office. */
  socketIds: Set<string>;
  position: Vector2;
  direction: Direction;
  /** Latest look, replayed to late joiners so they render it without a separate request. */
  avatar: AvatarProfile | null;
}

/**
 * In-memory record of who is currently connected to each office and where
 * their avatar last reported itself. One member per employee, however many
 * tabs they have open: joining again adds a connection, and only the last
 * connection leaving removes them. Single-instance only — swap for a shared
 * store (Redis, Supabase realtime) before running more than one backend node.
 */
@Injectable()
export class OfficePresenceRegistry {
  private readonly membersByOffice = new Map<UUID, Map<UUID, OfficeMember>>();

  /** Returns true when this is the employee's first connection to the office. */
  join(officeId: UUID, member: { employeeId: UUID; socketId: string; position: Vector2; direction: Direction; avatar: AvatarProfile | null }): boolean {
    let members = this.membersByOffice.get(officeId);
    if (!members) {
      members = new Map();
      this.membersByOffice.set(officeId, members);
    }
    const existing = members.get(member.employeeId);
    if (existing) {
      existing.socketIds.add(member.socketId);
      if (member.avatar) existing.avatar = member.avatar;
      return false;
    }
    members.set(member.employeeId, {
      employeeId: member.employeeId,
      socketIds: new Set([member.socketId]),
      position: member.position,
      direction: member.direction,
      avatar: member.avatar,
    });
    return true;
  }

  /** Returns true when that was the employee's last connection (they have now left the office). */
  leave(officeId: UUID, employeeId: UUID, socketId: string): boolean {
    const members = this.membersByOffice.get(officeId);
    const member = members?.get(employeeId);
    if (!members || !member || !member.socketIds.delete(socketId)) return false;
    if (member.socketIds.size > 0) return false;
    members.delete(employeeId);
    if (members.size === 0) this.membersByOffice.delete(officeId);
    return true;
  }

  updatePosition(officeId: UUID, employeeId: UUID, position: Vector2, direction: Direction): void {
    const member = this.membersByOffice.get(officeId)?.get(employeeId);
    if (member) {
      member.position = position;
      member.direction = direction;
    }
  }

  /** Returns false when the employee is not (or no longer) a member of the office. */
  updateAvatar(officeId: UUID, employeeId: UUID, avatar: AvatarProfile): boolean {
    const member = this.membersByOffice.get(officeId)?.get(employeeId);
    if (!member) return false;
    member.avatar = avatar;
    return true;
  }

  others(officeId: UUID, employeeId: UUID): OfficeMember[] {
    const members = this.membersByOffice.get(officeId);
    return members ? [...members.values()].filter((member) => member.employeeId !== employeeId) : [];
  }
}
