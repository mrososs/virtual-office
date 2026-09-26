import type { ActivityType } from '../types/activity.types.js';
import type { UUID } from '../types/common.types.js';
import type { Employee } from '../types/employee.types.js';
import type { Meeting } from '../types/meeting.types.js';
import type { Room, RoomType } from '../types/room.types.js';

import { ROLE_CONFIG } from './role-config.js';

/**
 * Where an employee's avatar should be in the office, derived from their
 * presence + resolved activity. This is domain logic, not rendering: the game
 * layer turns a placement into concrete seats and paths.
 */
export type PlacementIdleBehavior = 'STILL' | 'WANDER';

export type PlacementTarget =
  | { kind: 'DESK'; deskId: UUID; idle: PlacementIdleBehavior }
  | { kind: 'ROOM'; roomId: UUID; idle: PlacementIdleBehavior }
  | { kind: 'HIDDEN' };

export type PlacementRule =
  | { anchor: 'DESK'; idle: PlacementIdleBehavior }
  /** The room assigned to the employee's current meeting (falls back to their desk for remote-only meetings). */
  | { anchor: 'MEETING_ROOM' }
  /** First room of the listed types with spare capacity; ties go to the least-occupied room, then list order. */
  | { anchor: 'ROOM_TYPE'; roomTypes: RoomType[]; idle: PlacementIdleBehavior }
  | { anchor: 'HIDDEN' };

/**
 * Data, not branching: reorder or override per organization without touching
 * call sites. Day-to-day work (coding, building, testing, focus) stays at the
 * person's own desk; only collaboration, meetings and breaks move people.
 */
export const DEFAULT_PLACEMENT_RULES: Record<ActivityType, PlacementRule> = {
  AVAILABLE: { anchor: 'DESK', idle: 'WANDER' },
  WORKING: { anchor: 'DESK', idle: 'STILL' },
  CODING: { anchor: 'DESK', idle: 'STILL' },
  BUILDING: { anchor: 'DESK', idle: 'STILL' },
  TESTING: { anchor: 'DESK', idle: 'STILL' },
  BLOCKED: { anchor: 'DESK', idle: 'STILL' },
  FOCUS: { anchor: 'DESK', idle: 'STILL' },
  CODE_REVIEW: { anchor: 'ROOM_TYPE', roomTypes: ['CODE_REVIEW'], idle: 'STILL' },
  MEETING: { anchor: 'MEETING_ROOM' },
  BREAK: { anchor: 'ROOM_TYPE', roomTypes: ['BREAK'], idle: 'WANDER' },
  OFFLINE: { anchor: 'HIDDEN' },
  UNKNOWN: { anchor: 'DESK', idle: 'STILL' },
};

export interface PlacementContext {
  rooms: readonly Room[];
  meetingsById: Readonly<Record<UUID, Meeting>>;
  /** People already placed (or walking) into each room, excluding the employee being resolved. */
  assignedCountByRoomId?: Readonly<Record<UUID, number>>;
  rules?: Readonly<Record<ActivityType, PlacementRule>>;
}

export function resolveActivityPlacement(employee: Employee, context: PlacementContext): PlacementTarget {
  // Presence gates placement: work-tool activity never puts an offline person in the office.
  if (employee.presence.status === 'OFFLINE') {
    return { kind: 'HIDDEN' };
  }

  const rules = context.rules ?? DEFAULT_PLACEMENT_RULES;
  const rule = rules[employee.activity.type];

  switch (rule.anchor) {
    case 'HIDDEN':
      return { kind: 'HIDDEN' };

    case 'DESK':
      return deskOrFallback(employee, context, rule.idle);

    case 'MEETING_ROOM': {
      const meetingId = employee.meeting?.meetingId;
      const roomId = employee.meeting?.roomId ?? (meetingId ? context.meetingsById[meetingId]?.roomId : null);
      if (roomId && context.rooms.some((room) => room.id === roomId)) {
        return { kind: 'ROOM', roomId, idle: 'STILL' };
      }
      return deskOrFallback(employee, context, 'STILL');
    }

    case 'ROOM_TYPE': {
      const room = pickRoomByType(rule.roomTypes, context);
      return room ? { kind: 'ROOM', roomId: room.id, idle: rule.idle } : deskOrFallback(employee, context, rule.idle);
    }
  }
}

function deskOrFallback(
  employee: Employee,
  context: PlacementContext,
  idle: PlacementIdleBehavior,
): PlacementTarget {
  if (employee.assignedDesk) {
    return { kind: 'DESK', deskId: employee.assignedDesk.deskId, idle };
  }
  // No desk: the role's home area, then common space.
  const homeArea = ROLE_CONFIG[employee.role]?.defaultAreaType;
  const room = (homeArea ? pickRoomByType([homeArea], context) : null) ?? pickRoomByType(['GENERAL'], context);
  return room ? { kind: 'ROOM', roomId: room.id, idle } : { kind: 'HIDDEN' };
}

function pickRoomByType(roomTypes: readonly RoomType[], context: PlacementContext): Room | null {
  const assigned = context.assignedCountByRoomId ?? {};
  const candidates = roomTypes.flatMap((type, preference) =>
    context.rooms
      .filter((room) => room.type === type)
      .map((room) => ({ room, preference, load: (assigned[room.id] ?? 0) / Math.max(room.capacity, 1) })),
  );

  const withSpace = candidates.filter(({ room }) => (assigned[room.id] ?? 0) < room.capacity);
  const pool = withSpace.length > 0 ? withSpace : candidates;
  pool.sort((a, b) => a.load - b.load || a.preference - b.preference);
  return pool[0]?.room ?? null;
}
