/**
 * Stable, human-readable ids for every demo entity. Readable ids make the
 * simulation script and debugging far easier than random UUIDs; they are
 * still plain strings, so they satisfy the shared `UUID` alias.
 */
export const DEMO_ORGANIZATION_ID = 'org-acme';
export const DEMO_OFFICE_ID = 'office-acme-hq';
export const DEMO_FLOOR_ID = 'floor-acme-hq-1';

export const EMP = {
  mohamed: 'emp-mohamed',
  ahmed: 'emp-ahmed',
  sara: 'emp-sara',
  omar: 'emp-omar',
  rana: 'emp-rana',
  youssef: 'emp-youssef',
  mariam: 'emp-mariam',
  karim: 'emp-karim',
  nour: 'emp-nour',
  ali: 'emp-ali',
  hana: 'emp-hana',
  tamer: 'emp-tamer',
} as const;

export const TEAM = {
  frontend: 'team-frontend',
  backend: 'team-backend',
  mobile: 'team-mobile',
  design: 'team-design',
  quality: 'team-quality',
  platform: 'team-platform',
  product: 'team-product',
  leadership: 'team-leadership',
} as const;

export const ROOM = {
  manager: 'room-manager',
  meeting1: 'room-meeting-1',
  meeting2: 'room-meeting-2',
  focus: 'room-focus',
  codeReview: 'room-code-review',
  game: 'room-game',
  development: 'room-development',
  design: 'room-design',
  qa: 'room-qa',
  lounge: 'room-lounge',
  reception: 'room-reception',
} as const;

export const DESK = {
  dev01: 'desk-dev-01',
  dev02: 'desk-dev-02',
  dev03: 'desk-dev-03',
  dev04: 'desk-dev-04',
  dev05: 'desk-dev-05',
  dev06: 'desk-dev-06',
  dev07: 'desk-dev-07',
  dev08: 'desk-dev-08',
  des01: 'desk-des-01',
  des02: 'desk-des-02',
  des03: 'desk-des-03',
  des04: 'desk-des-04',
  qa01: 'desk-qa-01',
  qa02: 'desk-qa-02',
  qa03: 'desk-qa-03',
  mgr01: 'desk-mgr-01',
} as const;

export const MEETING = {
  frontendDaily: 'mtg-frontend-daily',
  designReview: 'mtg-design-review',
  sprintPlanning: 'mtg-sprint-planning',
  backendSync: 'mtg-backend-sync',
} as const;

export const WORK_ITEM = {
  orgPermissions: 'wi-16178',
  dashboardFilters: 'wi-16192',
  pipelineCaching: 'wi-16195',
  iosPush: 'wi-16188',
  regressionSuite: 'wi-16201',
  onboardingFlow: 'wi-16170',
  tenantSettings: 'wi-16184',
  designTokens: 'wi-16165',
  releaseNotes: 'wi-16210',
  testPlan: 'wi-16205',
  datePicker: 'wi-16207',
} as const;

export const PULL_REQUEST = {
  permissionMapping: 'pr-493',
  tenantSettingsApi: 'pr-498',
  dashboardFilters: 'pr-501',
} as const;

export const BUILD = {
  frontendCi: 'build-245',
  backendCi: 'build-246',
  frontendCiNext: 'build-247',
} as const;

/** Maps friendly `?demoUser=` values (first names) to employee ids. */
export const DEMO_IDENTITY_ALIASES: Record<string, string> = Object.fromEntries(
  Object.entries(EMP).map(([alias, id]) => [alias, id]),
);
