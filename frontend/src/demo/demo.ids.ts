/**
 * Stable, human-readable ids for every demo entity. Readable ids make the
 * simulation script and debugging far easier than random UUIDs; they are
 * still plain strings, so they satisfy the shared `UUID` alias.
 */
export const DEMO_ORGANIZATION_ID = 'org-demo';
export const DEMO_OFFICE_ID = 'office-demo-hq';
export const DEMO_FLOOR_ID = 'floor-demo-hq-1';

/** The demo team: one General Manager, one Project Manager, one Team Lead, developers and QA. */
export const EMP = {
  karim: 'emp-karim',
  mariam: 'emp-mariam',
  mohamed: 'emp-mohamed',
  ahmed: 'emp-ahmed',
  rana: 'emp-rana',
  youssef: 'emp-youssef',
  omar: 'emp-omar',
  tamer: 'emp-tamer',
  sara: 'emp-sara',
  nour: 'emp-nour',
  ali: 'emp-ali',
} as const;

/** Rooms and desks are the one physical HQ floor, shared with production and the backend. */
export { HQ_DESK as DESK, HQ_ROOM as ROOM } from '@virtual-office/shared';

export const MEETING = {
  teamDaily: 'mtg-team-daily',
  releaseReview: 'mtg-release-review',
  sprintPlanning: 'mtg-sprint-planning',
  apiSync: 'mtg-api-sync',
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

/** Demo addresses use the reserved example.com domain, so they can never reach a real mailbox. */
export function demoEmailFor(displayName: string): string {
  return `${displayName.toLowerCase().replace(/\s+/g, '.')}@example.com`;
}

/** Maps friendly `?demoUser=` values (first names) to employee ids. */
export const DEMO_IDENTITY_ALIASES: Record<string, string> = Object.fromEntries(
  Object.entries(EMP).map(([alias, id]) => [alias, id]),
);
