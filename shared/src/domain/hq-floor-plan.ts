import type { UUID } from '../types/common.types.js';
import type { EmployeeRole } from '../types/role.types.js';
import type { RoomType } from '../types/room.types.js';

import { ROLE_CONFIG } from './role-config.js';

/**
 * The iSaned HQ floor as a directory: which rooms and desks exist and which
 * room each desk stands in. This is the only floor-plan knowledge the backend
 * needs (validating and auto-assigning desks); the geometry the office renders
 * lives in the frontend layout (`features/office/layout/hq-floor-plan.ts`),
 * which is built from these same ids. Demo mode and production share it — it
 * is one physical office.
 */
export const HQ_ROOM = {
  gmOffice: 'room-gm-office',
  meeting1: 'room-meeting-1',
  meeting2: 'room-meeting-2',
  pmOffice: 'room-pm-office',
  collaboration: 'room-collaboration',
  game: 'room-game',
  development: 'room-development',
  teamLead: 'room-team-lead',
  qa: 'room-qa',
  lounge: 'room-lounge',
  reception: 'room-reception',
} as const;

export type HqRoomId = (typeof HQ_ROOM)[keyof typeof HQ_ROOM];

export const HQ_ROOM_TYPES: Readonly<Record<HqRoomId, RoomType>> = {
  [HQ_ROOM.gmOffice]: 'MANAGEMENT',
  [HQ_ROOM.meeting1]: 'MEETING',
  [HQ_ROOM.meeting2]: 'MEETING',
  [HQ_ROOM.pmOffice]: 'PROJECT_MANAGEMENT',
  [HQ_ROOM.collaboration]: 'CODE_REVIEW',
  [HQ_ROOM.game]: 'BREAK',
  [HQ_ROOM.development]: 'DEVELOPMENT',
  [HQ_ROOM.teamLead]: 'TEAM_LEAD',
  [HQ_ROOM.qa]: 'QA',
  [HQ_ROOM.lounge]: 'BREAK',
  [HQ_ROOM.reception]: 'GENERAL',
};

export const HQ_DESK = {
  gm01: 'desk-gm-01',
  pm01: 'desk-pm-01',
  tl01: 'desk-tl-01',
  tl02: 'desk-tl-02',
  dev01: 'desk-dev-01',
  dev02: 'desk-dev-02',
  dev03: 'desk-dev-03',
  dev04: 'desk-dev-04',
  dev05: 'desk-dev-05',
  dev06: 'desk-dev-06',
  dev07: 'desk-dev-07',
  dev08: 'desk-dev-08',
  qa01: 'desk-qa-01',
  qa02: 'desk-qa-02',
  qa03: 'desk-qa-03',
} as const;

export type HqDeskId = (typeof HQ_DESK)[keyof typeof HQ_DESK];

/** Desk → the room it stands in, in assignment order (first free desk in an area wins). */
export const HQ_DESK_ROOMS: ReadonlyArray<{ deskId: HqDeskId; roomId: HqRoomId }> = [
  { deskId: HQ_DESK.gm01, roomId: HQ_ROOM.gmOffice },
  { deskId: HQ_DESK.pm01, roomId: HQ_ROOM.pmOffice },
  { deskId: HQ_DESK.tl01, roomId: HQ_ROOM.teamLead },
  { deskId: HQ_DESK.tl02, roomId: HQ_ROOM.teamLead },
  { deskId: HQ_DESK.dev01, roomId: HQ_ROOM.development },
  { deskId: HQ_DESK.dev02, roomId: HQ_ROOM.development },
  { deskId: HQ_DESK.dev03, roomId: HQ_ROOM.development },
  { deskId: HQ_DESK.dev04, roomId: HQ_ROOM.development },
  { deskId: HQ_DESK.dev05, roomId: HQ_ROOM.development },
  { deskId: HQ_DESK.dev06, roomId: HQ_ROOM.development },
  { deskId: HQ_DESK.dev07, roomId: HQ_ROOM.development },
  { deskId: HQ_DESK.dev08, roomId: HQ_ROOM.development },
  { deskId: HQ_DESK.qa01, roomId: HQ_ROOM.qa },
  { deskId: HQ_DESK.qa02, roomId: HQ_ROOM.qa },
  { deskId: HQ_DESK.qa03, roomId: HQ_ROOM.qa },
];

export function isHqDeskId(value: unknown): value is HqDeskId {
  return typeof value === 'string' && HQ_DESK_ROOMS.some((entry) => entry.deskId === value);
}

/**
 * The first free desk in the role's home area (`ROLE_CONFIG[role].defaultAreaType`),
 * or null when that area is full. Same rule as `assignDesksByRole`, without geometry.
 */
export function pickHqDeskForRole(role: EmployeeRole, takenDeskIds: ReadonlySet<UUID>): HqDeskId | null {
  const areaType = ROLE_CONFIG[role]?.defaultAreaType;
  const free = HQ_DESK_ROOMS.find((entry) => HQ_ROOM_TYPES[entry.roomId] === areaType && !takenDeskIds.has(entry.deskId));
  return free?.deskId ?? null;
}
