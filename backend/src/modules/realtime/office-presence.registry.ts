import { Injectable } from '@nestjs/common';
import type { Direction, UUID, Vector2 } from '@virtual-office/shared';

export interface OfficeMember {
  employeeId: UUID;
  socketId: string;
  position: Vector2;
  direction: Direction;
}

/**
 * In-memory record of who is currently connected to each office and where
 * their avatar last reported itself. Single-instance only — swap for a shared
 * store (Redis, Supabase realtime) before running more than one backend node.
 */
@Injectable()
export class OfficePresenceRegistry {
  private readonly membersByOffice = new Map<UUID, Map<UUID, OfficeMember>>();

  upsert(officeId: UUID, member: OfficeMember): void {
    let members = this.membersByOffice.get(officeId);
    if (!members) {
      members = new Map();
      this.membersByOffice.set(officeId, members);
    }
    members.set(member.employeeId, member);
  }

  updatePosition(officeId: UUID, employeeId: UUID, position: Vector2, direction: Direction): void {
    const member = this.membersByOffice.get(officeId)?.get(employeeId);
    if (member) {
      member.position = position;
      member.direction = direction;
    }
  }

  /** Removes the member only if `socketId` still owns the entry (another tab may have taken over). */
  remove(officeId: UUID, employeeId: UUID, socketId: string): boolean {
    const members = this.membersByOffice.get(officeId);
    const member = members?.get(employeeId);
    if (!members || !member || member.socketId !== socketId) return false;
    members.delete(employeeId);
    if (members.size === 0) this.membersByOffice.delete(officeId);
    return true;
  }

  others(officeId: UUID, employeeId: UUID): OfficeMember[] {
    const members = this.membersByOffice.get(officeId);
    return members ? [...members.values()].filter((member) => member.employeeId !== employeeId) : [];
  }
}
