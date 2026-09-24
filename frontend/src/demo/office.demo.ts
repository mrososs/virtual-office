import type { Bounds, Desk, Direction, Office, OfficeFloor, Room, RoomType } from '@virtual-office/shared';

import type {
  DoorPlacement,
  FloorArea,
  FloorStyle,
  FurnitureAngle,
  FurnitureKind,
  FurniturePlacement,
  MapSpot,
  OfficeMapDefinition,
  RoomLayout,
  RugPlacement,
  WallSegment,
  WallStyle,
} from '@/game/maps/office-map.types';

import { DEMO_FLOOR_ID, DEMO_OFFICE_ID, DEMO_ORGANIZATION_ID, DESK, EMP, ROOM } from './demo.ids';

/*
 * Acme HQ floor plan, authored on a 32px grid. Building-relative tile
 * coordinates (c, r) start at the building's top-left corner; the building is
 * inset from the world edge (a little more at the top, where the HUD sits). Layout:
 *
 *   r0  ┌ Manager ┬ Meeting 1 ┬ Meeting 2 ┬ Focus ┬ Code Review ┬ Game Room ┐
 *   r10 ├──────────────────────── corridor ────────────────────────────────┤
 *   r13 │ Development      │walk│ Design │ QA   │ Lounge & Kitchen          │
 *   r26 └──────────┬────── reception ──────┬───────────────────────────────┘
 *   r34            └─────── entrance ──────┘
 */
const TILE = 32;
const ORIGIN_X = TILE;
const ORIGIN_Y = 1.5 * TILE;
const BUILDING_COLS = 60;
const BUILDING_ROWS = 34;

const X = (c: number) => ORIGIN_X + c * TILE;
const Y = (r: number) => ORIGIN_Y + r * TILE;
const at = (c: number, r: number) => ({ x: X(c), y: Y(r) });
const area = (c0: number, r0: number, c1: number, r1: number): Bounds => ({
  x: X(c0),
  y: Y(r0),
  width: (c1 - c0) * TILE,
  height: (r1 - r0) * TILE,
});
const spot = (c: number, r: number, facing: Direction): MapSpot => ({ ...at(c, r), facing });

interface RoomSeed {
  id: string;
  name: string;
  type: RoomType;
  tiles: [number, number, number, number];
  capacity: number;
  floor: FloorStyle;
  label: [number, number];
  sign?: [number, number];
  spots: MapSpot[];
}

const ROOM_SEEDS: RoomSeed[] = [
  {
    id: ROOM.manager,
    name: 'Manager Office',
    type: 'MANAGER',
    tiles: [0, 0, 9, 10],
    capacity: 4,
    floor: 'WOOD_DARK',
    label: [0.4, 0.4],
    spots: [
      spot(4.0, 5.1, 'up'),
      spot(5.6, 5.1, 'up'),
      spot(0.95, 6.75, 'right'),
      spot(0.95, 7.65, 'right'),
      spot(3.75, 7.2, 'left'),
    ],
  },
  {
    id: ROOM.meeting1,
    name: 'Meeting Room 1',
    type: 'MEETING',
    tiles: [9, 0, 17, 10],
    capacity: 4,
    floor: 'WOOD_LIGHT',
    label: [9.4, 0.4],
    sign: [12.1, 9.05],
    spots: [spot(13, 3.1, 'down'), spot(11.3, 4.75, 'right'), spot(14.7, 4.75, 'left'), spot(13, 6.4, 'up')],
  },
  {
    id: ROOM.meeting2,
    name: 'Meeting Room 2',
    type: 'MEETING',
    tiles: [17, 0, 29, 10],
    capacity: 8,
    floor: 'WOOD_LIGHT',
    label: [17.4, 0.4],
    sign: [24.6, 9.05],
    spots: [
      spot(21, 3.2, 'down'),
      spot(23, 3.2, 'down'),
      spot(25, 3.2, 'down'),
      spot(21, 6.4, 'up'),
      spot(23, 6.4, 'up'),
      spot(25, 6.4, 'up'),
      spot(19.2, 4.8, 'right'),
      spot(26.8, 4.8, 'left'),
    ],
  },
  {
    id: ROOM.focus,
    name: 'Focus Room',
    type: 'FOCUS',
    tiles: [29, 0, 36, 10],
    capacity: 3,
    floor: 'CARPET_LAVENDER',
    label: [29.4, 0.4],
    spots: [spot(30.6, 3.3, 'up'), spot(34.4, 3.3, 'up'), spot(32.5, 6.85, 'up'), spot(30.45, 8.45, 'down')],
  },
  {
    id: ROOM.codeReview,
    name: 'Code Review',
    type: 'CODE_REVIEW',
    tiles: [36, 0, 47, 10],
    capacity: 8,
    floor: 'CARPET_SAND',
    label: [36.4, 0.4],
    spots: [
      spot(39.8, 3.35, 'down'),
      spot(41.5, 3.35, 'down'),
      spot(43.2, 3.35, 'down'),
      spot(39.8, 6.45, 'up'),
      spot(41.5, 6.45, 'up'),
      spot(43.2, 6.45, 'up'),
      spot(37.7, 8.4, 'down'),
      spot(39.5, 8.4, 'down'),
      spot(45.2, 2.2, 'up'),
    ],
  },
  {
    id: ROOM.game,
    name: 'Game Room',
    type: 'GAME',
    tiles: [47, 0, 60, 10],
    capacity: 10,
    floor: 'RUBBER_TEAL',
    label: [47.4, 0.4],
    spots: [
      spot(48.85, 3.8, 'right'),
      spot(54.15, 3.8, 'left'),
      spot(57.6, 3.95, 'down'),
      spot(57.6, 6.05, 'up'),
      spot(49.3, 8.4, 'down'),
      spot(51, 8.75, 'down'),
      spot(52.7, 8.4, 'down'),
      spot(56.9, 2.05, 'up'),
      spot(58.4, 2.05, 'up'),
    ],
  },
  {
    id: ROOM.development,
    name: 'Development',
    type: 'DEVELOPMENT',
    tiles: [0, 13, 24, 26],
    capacity: 14,
    floor: 'CARPET_BLUE',
    label: [0.4, 13.4],
    spots: [
      spot(18.6, 17.55, 'down'),
      spot(20.4, 17.55, 'down'),
      spot(18.6, 19.45, 'up'),
      spot(20.4, 19.45, 'up'),
      spot(3.9, 21.35, 'down'),
      spot(5.1, 21.35, 'down'),
      spot(2.2, 22.85, 'right'),
      spot(6.8, 22.85, 'left'),
      spot(10.3, 22.45, 'up'),
      spot(11.7, 22.45, 'up'),
    ],
  },
  {
    id: ROOM.design,
    name: 'Design Studio',
    type: 'DESIGN',
    tiles: [27, 13, 36, 26],
    capacity: 6,
    floor: 'CARPET_ROSE',
    label: [27.4, 13.4],
    spots: [spot(29.95, 21.2, 'right'), spot(33.05, 21.2, 'left'), spot(30.8, 24.6, 'down'), spot(32.2, 24.6, 'down')],
  },
  {
    id: ROOM.qa,
    name: 'QA Lab',
    type: 'QA',
    tiles: [36, 13, 44, 26],
    capacity: 5,
    floor: 'CARPET_MINT',
    label: [36.4, 13.4],
    spots: [spot(39.2, 21.85, 'up'), spot(40.8, 21.85, 'up')],
  },
  {
    id: ROOM.lounge,
    name: 'Lounge & Kitchen',
    type: 'LOUNGE',
    tiles: [44, 13, 60, 26],
    capacity: 12,
    floor: 'WOOD_LIGHT',
    label: [52.9, 19.2],
    spots: [
      spot(47.9, 20.5, 'down'),
      spot(49.1, 20.5, 'down'),
      spot(51.2, 22.05, 'left'),
      spot(47.9, 23.6, 'up'),
      spot(49.1, 23.6, 'up'),
      spot(53.6, 15.95, 'down'),
      spot(55.4, 15.95, 'down'),
      spot(53.6, 17.85, 'up'),
      spot(55.4, 17.85, 'up'),
      spot(51.5, 14.8, 'up'),
      spot(56.8, 23.85, 'up'),
      spot(58.4, 23.85, 'up'),
    ],
  },
  {
    id: ROOM.reception,
    name: 'Reception',
    type: 'GENERAL',
    tiles: [17, 26, 34, 34],
    capacity: 8,
    floor: 'MARBLE',
    label: [17.4, 26.4],
    spots: [
      spot(30.2, 27.9, 'down'),
      spot(31.4, 27.9, 'down'),
      spot(28.8, 29.45, 'right'),
      spot(32.8, 29.45, 'left'),
      spot(21, 29.75, 'up'),
    ],
  },
];

interface DeskSeed {
  id: string;
  employeeId: string | null;
  at: [number, number];
  rotation: FurnitureAngle;
}

const DESK_SEEDS: DeskSeed[] = [
  { id: DESK.dev01, employeeId: EMP.mohamed, at: [3.5, 16.73], rotation: 180 },
  { id: DESK.dev02, employeeId: EMP.ahmed, at: [5.5, 16.73], rotation: 180 },
  { id: DESK.dev03, employeeId: EMP.youssef, at: [3.5, 17.67], rotation: 0 },
  { id: DESK.dev04, employeeId: EMP.rana, at: [5.5, 17.67], rotation: 0 },
  { id: DESK.dev05, employeeId: EMP.tamer, at: [9.5, 16.73], rotation: 180 },
  { id: DESK.dev06, employeeId: EMP.ali, at: [11.5, 16.73], rotation: 180 },
  { id: DESK.dev07, employeeId: null, at: [9.5, 17.67], rotation: 0 },
  { id: DESK.dev08, employeeId: null, at: [11.5, 17.67], rotation: 0 },
  { id: DESK.des01, employeeId: EMP.sara, at: [30.5, 16.73], rotation: 180 },
  { id: DESK.des02, employeeId: EMP.nour, at: [32.5, 16.73], rotation: 180 },
  { id: DESK.des03, employeeId: EMP.mariam, at: [30.5, 17.67], rotation: 0 },
  { id: DESK.des04, employeeId: null, at: [32.5, 17.67], rotation: 0 },
  { id: DESK.qa01, employeeId: EMP.omar, at: [38, 16.73], rotation: 180 },
  { id: DESK.qa02, employeeId: EMP.hana, at: [40, 16.73], rotation: 180 },
  { id: DESK.qa03, employeeId: null, at: [42, 16.73], rotation: 180 },
  { id: DESK.mgr01, employeeId: EMP.karim, at: [4.8, 4.0], rotation: 180 },
];

function buildWalls(): { walls: WallSegment[]; doors: DoorPlacement[] } {
  const walls: WallSegment[] = [];
  const doors: DoorPlacement[] = [];

  const run = (
    axis: 'h' | 'v',
    fixed: number,
    start: number,
    end: number,
    style: WallStyle,
    gaps: Array<[number, number]> = [],
  ) => {
    const point = (value: number) => (axis === 'h' ? at(value, fixed) : at(fixed, value));
    let cursor = start;
    for (const [gapStart, gapEnd] of [...gaps].sort((a, b) => a[0] - b[0])) {
      if (gapStart > cursor) walls.push({ from: point(cursor), to: point(gapStart), style });
      doors.push({ from: point(gapStart), to: point(gapEnd) });
      cursor = gapEnd;
    }
    if (end > cursor) walls.push({ from: point(cursor), to: point(end), style });
  };

  // Building shell
  run('h', 0, 0, 60, 'OUTER');
  run('v', 0, 0, 26, 'OUTER');
  run('v', 60, 0, 26, 'OUTER');
  run('h', 26, 0, 17, 'OUTER');
  run('h', 26, 34, 60, 'OUTER');
  run('v', 17, 26, 34, 'OUTER');
  run('v', 34, 26, 34, 'OUTER');
  run('h', 34, 17, 34, 'OUTER', [[24, 27]]);
  // The entrance is a closed glass door: visible threshold, but it keeps avatars inside.
  walls.push({ from: at(24, 34), to: at(27, 34), style: 'GLASS' });

  // Top band: room fronts on the corridor, glass for the collaboration rooms
  run('h', 10, 0, 9, 'INNER', [[5.5, 7.5]]);
  run('h', 10, 9, 17, 'GLASS', [[14.8, 16.7]]);
  run('h', 10, 17, 29, 'GLASS', [[18.4, 20.4]]);
  run('h', 10, 29, 36, 'INNER', [[31.5, 33.5]]);
  run('h', 10, 36, 47, 'GLASS', [[42.4, 44.9]]);
  run('h', 10, 47, 60, 'INNER', [[52.4, 54.9]]);
  for (const c of [9, 17, 29, 36, 47]) run('v', c, 0, 10, 'INNER');

  // Reception link and the lounge
  run('h', 26, 17, 34, 'INNER', [[24, 27]]);
  run('h', 13, 44, 60, 'INNER', [[45.4, 48.4]]);
  run('v', 44, 13, 26, 'INNER', [[18.3, 20.5]]);

  return { walls, doors };
}

function buildFurniture(): FurniturePlacement[] {
  const items: FurniturePlacement[] = [];
  const place = (kind: FurnitureKind, c: number, r: number, angle: FurnitureAngle = 0, extra: Partial<FurniturePlacement> = {}) => {
    items.push({ id: `f-${items.length + 1}-${kind.toLowerCase()}`, kind, ...at(c, r), angle, ...extra });
  };

  // Manager Office
  place('BOOKSHELF', 5.5, 0.62);
  place('CHAIR', 4.0, 5.1, 180);
  place('CHAIR', 5.6, 5.1, 180);
  place('SOFA', 0.9, 7.2, 270, { variant: 'SLATE' });
  place('COFFEE_TABLE', 2.35, 7.2, 90);
  place('ARMCHAIR', 3.75, 7.2, 90, { variant: 'AMBER' });
  place('PLANT_LARGE', 8.2, 0.95);
  place('PLANT_LARGE', 8.2, 9.15);
  place('FLOOR_LAMP', 0.75, 9.25);

  // Meeting Room 1
  place('TV_SCREEN', 16.55, 4.75, 90, { meetingRoomId: ROOM.meeting1 });
  place('MEETING_TABLE_ROUND', 13, 4.75);
  place('CHAIR', 13, 3.1, 0);
  place('CHAIR', 11.3, 4.75, 270);
  place('CHAIR', 14.7, 4.75, 90);
  place('CHAIR', 13, 6.4, 180);
  place('PLANT_SMALL', 9.75, 9.2);
  place('PLANT_SMALL', 16.3, 0.8);

  // Meeting Room 2
  place('TV_SCREEN', 24.6, 0.45, 0, { meetingRoomId: ROOM.meeting2 });
  place('MEETING_TABLE_LONG', 23, 4.8);
  for (const c of [21, 23, 25]) {
    place('CHAIR', c, 3.2, 0);
    place('CHAIR', c, 6.4, 180);
  }
  place('CHAIR', 19.2, 4.8, 270);
  place('CHAIR', 26.8, 4.8, 90);
  place('PLANT_LARGE', 28.15, 0.95);
  place('PLANT_SMALL', 28.3, 9.2);

  // Focus Room
  place('FOCUS_POD', 30.6, 2.1);
  place('FOCUS_POD', 34.4, 2.1);
  place('FOCUS_POD', 32.5, 5.65);
  place('ARMCHAIR', 30.45, 8.45, 0, { variant: 'LAVENDER' });
  place('FLOOR_LAMP', 29.65, 9.25);
  place('BOOKSHELF', 35.45, 7.6, 90);
  place('PLANT_LARGE', 35.25, 9.15);

  // Code Review
  place('BIG_SCREEN', 42.6, 0.47);
  place('REVIEW_TABLE', 41.5, 4.9);
  for (const c of [39.8, 41.5, 43.2]) {
    place('CHAIR', c, 3.35, 0);
    place('CHAIR', c, 6.45, 180);
  }
  place('WHITEBOARD', 46.6, 4.6, 90);
  place('ARMCHAIR', 37.7, 8.4, 0, { variant: 'INDIGO' });
  place('ARMCHAIR', 39.5, 8.4, 0, { variant: 'INDIGO' });
  place('PLANT_LARGE', 46.2, 9.15);

  // Game Room
  place('TV_SCREEN', 52.2, 0.45);
  place('PING_PONG', 51.5, 3.8);
  place('ARCADE', 56.9, 0.85, 0, { variant: 'PINK' });
  place('ARCADE', 58.4, 0.85, 0, { variant: 'CYAN' });
  place('FOOSBALL', 57.6, 5);
  place('BEANBAG', 49.3, 8.4, 0, { variant: 'CORAL' });
  place('BEANBAG', 51, 8.75, 0, { variant: 'YELLOW' });
  place('BEANBAG', 52.7, 8.4, 0, { variant: 'VIOLET' });
  place('PLANT_LARGE', 59.2, 9.15);

  // Corridor
  place('PLANT_SMALL', 0.7, 11.5);
  place('PLANT_SMALL', 59.3, 11.5);
  place('WATER_COOLER', 35.6, 10.65);

  // Development
  place('WHITEBOARD_STAND', 19.5, 14.35);
  place('DINING_TABLE', 19.5, 18.5);
  for (const c of [18.6, 20.4]) {
    place('STOOL', c, 17.55);
    place('STOOL', c, 19.45);
  }
  place('SOFA', 4.5, 21.35, 0, { variant: 'INDIGO' });
  place('COFFEE_TABLE', 4.5, 22.85);
  place('ARMCHAIR', 2.2, 22.85, 270, { variant: 'TEAL' });
  place('ARMCHAIR', 6.8, 22.85, 90, { variant: 'TEAL' });
  place('WHITEBOARD_STAND', 11, 21.45);
  place('PRINTER', 15.4, 25.3);
  place('PLANT_LARGE', 0.8, 25.2);
  place('PLANT_LARGE', 23.2, 25.2);
  place('PLANT_SMALL', 14.3, 13.75);
  place('PLANTER_LONG', 23.65, 21.8, 90);

  // Design Studio
  place('PLANTER_LONG', 27.35, 21.8, 90);
  place('DRAWING_TABLE', 31.5, 21.2);
  place('MOODBOARD', 31.5, 25.55);
  place('PLANT_LARGE', 35.25, 25.2);
  place('PLANT_SMALL', 27.8, 25.3);
  place('PLANTER_LONG', 36, 21.5, 90);

  // QA Lab
  place('DEVICE_RACK', 40, 20.8);
  place('PLANT_LARGE', 43.25, 25.2);
  place('PLANT_SMALL', 36.75, 25.3);
  place('BOOKSHELF', 40, 25.55);

  // Lounge & Kitchen
  place('KITCHEN_COUNTER', 51.5, 13.66, 0, { variant: 'SINK' });
  place('KITCHEN_COUNTER', 55.5, 13.66, 0, { variant: 'COFFEE' });
  place('FRIDGE', 58.6, 13.72);
  place('WATER_COOLER', 59.4, 15.1);
  place('DINING_TABLE', 54.5, 16.9);
  for (const c of [53.6, 55.4]) {
    place('STOOL', c, 15.95);
    place('STOOL', c, 17.85);
  }
  place('SOFA', 48.5, 20.5, 0, { variant: 'AMBER' });
  place('COFFEE_TABLE', 48.5, 22.05);
  place('SOFA', 48.5, 23.6, 180, { variant: 'AMBER' });
  place('ARMCHAIR', 51.2, 22.05, 90, { variant: 'TEAL' });
  place('ARMCHAIR', 56.8, 23.85, 180, { variant: 'INDIGO' });
  place('ARMCHAIR', 58.4, 23.85, 180, { variant: 'INDIGO' });
  place('COFFEE_TABLE', 57.6, 25.1);
  place('BOOKSHELF', 59.55, 20.5, 90);
  place('PLANT_LARGE', 44.8, 25.2);
  place('PLANT_LARGE', 59.2, 17.4);

  // Reception
  place('RECEPTION_DESK', 21, 28.4);
  place('SOFA', 30.8, 27.9, 0, { variant: 'SLATE' });
  place('COFFEE_TABLE', 30.8, 29.45);
  place('ARMCHAIR', 28.8, 29.45, 270, { variant: 'INDIGO' });
  place('ARMCHAIR', 32.8, 29.45, 90, { variant: 'INDIGO' });
  place('PLANT_LARGE', 23, 33.15);
  place('PLANT_LARGE', 28, 33.15);
  place('PLANT_LARGE', 17.9, 33.1);
  place('PLANT_LARGE', 33.2, 26.8);
  place('WATER_COOLER', 17.65, 31.6);

  return items;
}

function buildRugs(): RugPlacement[] {
  return [
    { bounds: area(1.9, 2.3, 7.7, 6.1), color: 0x8f6f52, pattern: 'BORDERED' },
    { bounds: area(47.9, 1.6, 55.1, 6.0), color: 0x2c5c6e, pattern: 'STRIPED' },
    { bounds: area(1.2, 20.35, 7.8, 24.5), color: 0x6d7fb0, pattern: 'BORDERED' },
    { bounds: area(45.3, 19.55, 52.4, 25.1), color: 0xc49a6c, pattern: 'BORDERED' },
    { bounds: area(28.1, 27.25, 33.5, 31.1), color: 0x9aa7ba, pattern: 'PLAIN' },
    { bounds: area(29.6, 7.4, 31.4, 9.5), color: 0x9b8cc9, pattern: 'PLAIN' },
  ];
}

export interface DemoOfficeData {
  office: Office;
  floor: OfficeFloor;
  rooms: Room[];
  desks: Desk[];
  map: OfficeMapDefinition;
}

export function createDemoOffice(): DemoOfficeData {
  const office: Office = { id: DEMO_OFFICE_ID, organizationId: DEMO_ORGANIZATION_ID, name: 'Acme HQ', defaultFloorId: DEMO_FLOOR_ID };
  const floor: OfficeFloor = { id: DEMO_FLOOR_ID, officeId: DEMO_OFFICE_ID, name: 'Floor 1', mapKey: 'acme-hq-floor-1', order: 1 };

  const rooms: Room[] = ROOM_SEEDS.map((seed) => {
    const [c0, r0, c1, r1] = seed.tiles;
    const firstSpot = seed.spots[0];
    return {
      id: seed.id,
      officeId: DEMO_OFFICE_ID,
      floorId: DEMO_FLOOR_ID,
      name: seed.name,
      type: seed.type,
      bounds: area(c0, r0, c1, r1),
      capacity: seed.capacity,
      navigationTarget: firstSpot ? { x: firstSpot.x, y: firstSpot.y } : at((c0 + c1) / 2, (r0 + r1) / 2),
      isReserved: false,
      activeMeetingId: null,
    };
  });

  const desks: Desk[] = DESK_SEEDS.map((seed) => ({
    id: seed.id,
    officeId: DEMO_OFFICE_ID,
    employeeId: seed.employeeId,
    position: at(seed.at[0], seed.at[1]),
    rotation: seed.rotation,
    type: 'STANDARD',
  }));

  const floors: FloorArea[] = [
    { bounds: area(0, 0, 60, 26), style: 'CORRIDOR' },
    { bounds: area(17, 26, 34, 34), style: 'CORRIDOR' },
    ...ROOM_SEEDS.map((seed) => ({ bounds: area(...seed.tiles), style: seed.floor })),
    { bounds: area(49, 13, 60, 18.75), style: 'TILE_KITCHEN' as const },
  ];

  const roomLayouts: RoomLayout[] = ROOM_SEEDS.map((seed) => ({
    roomId: seed.id,
    label: at(...seed.label),
    sign: seed.sign ? at(...seed.sign) : undefined,
    spots: seed.spots,
  }));

  const { walls, doors } = buildWalls();

  const map: OfficeMapDefinition = {
    key: floor.mapKey,
    width: ORIGIN_X * 2 + BUILDING_COLS * TILE,
    height: ORIGIN_Y * 2 + BUILDING_ROWS * TILE,
    tileSize: TILE,
    footprint: [area(0, 0, 60, 26), area(17, 26, 34, 34)],
    floors,
    rugs: buildRugs(),
    walls,
    doors,
    furniture: buildFurniture(),
    roomLayouts,
    floorTexts: [{ text: 'ACME HQ', x: X(25.5), y: Y(29.45), size: 15, color: '#8a93a6', alpha: 0.6 }],
    playerSpawn: spot(25.5, 32.4, 'up'),
    entrance: spot(25.5, 33.55, 'up'),
  };

  return { office, floor, rooms, desks, map };
}
