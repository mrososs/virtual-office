import { Injectable } from '@nestjs/common';
import type { AvatarProfile, Direction, LiveRoomOccupancy, UUID, Vector2 } from '@virtual-office/shared';

export interface OfficeMember {
  employeeId: UUID;
  /** Every open connection (tab/device) of this employee in the office. */
  socketIds: Set<string>;
  position: Vector2;
  direction: Direction;
  /** Latest look, replayed to late joiners so they render it without a separate request. */
  avatar: AvatarProfile | null;
  /** The room the employee's avatar last reported being in (null = hallway). Cleared when they leave the office. */
  roomId: UUID | null;
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
      roomId: null,
    });
    return true;
  }

  /**
   * Returns `left: true` when that was the employee's last connection (they
   * have now left the office), with the room they were in so it can be
   * updated for everyone — no stale occupant survives a closed tab.
   */
  leave(officeId: UUID, employeeId: UUID, socketId: string): { left: boolean; roomId: UUID | null } {
    const members = this.membersByOffice.get(officeId);
    const member = members?.get(employeeId);
    if (!members || !member || !member.socketIds.delete(socketId)) return { left: false, roomId: null };
    if (member.socketIds.size > 0) return { left: false, roomId: null };
    members.delete(employeeId);
    if (members.size === 0) this.membersByOffice.delete(officeId);
    return { left: true, roomId: member.roomId };
  }

  /** Records the room an employee is in. Returns the previous room, or undefined when nothing changed. */
  setRoom(officeId: UUID, employeeId: UUID, roomId: UUID | null): { previous: UUID | null } | undefined {
    const member = this.membersByOffice.get(officeId)?.get(employeeId);
    if (!member || member.roomId === roomId) return undefined;
    const previous = member.roomId;
    member.roomId = roomId;
    return { previous };
  }

  roomOf(officeId: UUID, employeeId: UUID): UUID | null {
    return this.membersByOffice.get(officeId)?.get(employeeId)?.roomId ?? null;
  }

  /** Connected employees in a room, in a stable order. */
  occupants(officeId: UUID, roomId: UUID): LiveRoomOccupancy {
    const members = this.membersByOffice.get(officeId);
    const employeeIds = members ? [...members.values()].filter((member) => member.roomId === roomId).map((member) => member.employeeId).sort() : [];
    return { roomId, employeeIds };
  }

  /** Every room with at least one connected employee in it. */
  occupiedRooms(officeId: UUID): LiveRoomOccupancy[] {
    const rooms = new Set<UUID>();
    for (const member of this.membersByOffice.get(officeId)?.values() ?? []) if (member.roomId) rooms.add(member.roomId);
    return [...rooms].map((roomId) => this.occupants(officeId, roomId));
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
