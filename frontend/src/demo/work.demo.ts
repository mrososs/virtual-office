import type { Build, PullRequest, Sprint, WorkItem, WorkItemState, WorkItemType, UUID } from '@virtual-office/shared';

import { BUILD, DEMO_ORGANIZATION_ID, EMP, PULL_REQUEST, WORK_ITEM } from './demo.ids';

/**
 * Azure DevOps data as it would look after the azure-devops adapters mapped
 * REST/Service Hook payloads into internal models. No real API calls.
 */
const PROJECT = 'Acme Platform';

interface WorkItemSeed {
  id: UUID;
  type: WorkItemType;
  title: string;
  state: WorkItemState;
  assignee: UUID | null;
}

const WORK_ITEM_SEEDS: WorkItemSeed[] = [
  { id: WORK_ITEM.orgPermissions, type: 'TASK', title: 'Fix organization feature permissions', state: 'ACTIVE', assignee: EMP.mohamed },
  { id: WORK_ITEM.dashboardFilters, type: 'TASK', title: 'Dashboard filters for sprint health', state: 'ACTIVE', assignee: EMP.ahmed },
  { id: WORK_ITEM.pipelineCaching, type: 'TASK', title: 'Cache pipeline dependencies', state: 'NEW', assignee: EMP.youssef },
  { id: WORK_ITEM.iosPush, type: 'BUG', title: 'iOS push notifications drop after token refresh', state: 'BLOCKED', assignee: EMP.tamer },
  { id: WORK_ITEM.regressionSuite, type: 'TASK', title: 'Regression suite: organization settings', state: 'ACTIVE', assignee: EMP.hana },
  { id: WORK_ITEM.onboardingFlow, type: 'USER_STORY', title: 'Onboarding flow redesign', state: 'ACTIVE', assignee: EMP.sara },
  { id: WORK_ITEM.tenantSettings, type: 'TASK', title: 'Tenant settings API', state: 'IN_REVIEW', assignee: EMP.youssef },
  { id: WORK_ITEM.designTokens, type: 'FEATURE', title: 'Design tokens v2', state: 'ACTIVE', assignee: EMP.nour },
  { id: WORK_ITEM.releaseNotes, type: 'TASK', title: 'Release notes 2.4', state: 'NEW', assignee: EMP.mariam },
  { id: WORK_ITEM.testPlan, type: 'TASK', title: 'Test plan: feature permissions', state: 'ACTIVE', assignee: EMP.omar },
  { id: WORK_ITEM.datePicker, type: 'TASK', title: 'Accessible date picker', state: 'ACTIVE', assignee: EMP.rana },
];

export function externalIdOf(id: UUID): string {
  return id.replace(/^(wi|pr|build)-/, '');
}

export function createDemoWorkItems(now: number): WorkItem[] {
  return WORK_ITEM_SEEDS.map((seed, index) => ({
    id: seed.id,
    organizationId: DEMO_ORGANIZATION_ID,
    provider: 'AZURE_DEVOPS',
    externalId: externalIdOf(seed.id),
    type: seed.type,
    title: seed.title,
    state: seed.state,
    assignedEmployeeId: seed.assignee,
    projectName: PROJECT,
    url: null,
    updatedAt: new Date(now - (index + 1) * 7 * 60_000).toISOString(),
  }));
}

export function createDemoPullRequests(now: number): PullRequest[] {
  const iso = (minutesAgo: number) => new Date(now - minutesAgo * 60_000).toISOString();
  return [
    {
      id: PULL_REQUEST.permissionMapping,
      organizationId: DEMO_ORGANIZATION_ID,
      provider: 'AZURE_DEVOPS',
      externalId: '493',
      title: 'Fix feature permission mapping',
      repository: 'acme-web',
      sourceBranch: 'feature/16178-org-permissions',
      targetBranch: 'main',
      status: 'ACTIVE',
      authorEmployeeId: EMP.mohamed,
      reviewerEmployeeIds: [EMP.omar],
      linkedWorkItemId: WORK_ITEM.orgPermissions,
      url: null,
      updatedAt: iso(15),
    },
    {
      id: PULL_REQUEST.tenantSettingsApi,
      organizationId: DEMO_ORGANIZATION_ID,
      provider: 'AZURE_DEVOPS',
      externalId: '498',
      title: 'Tenant settings API',
      repository: 'acme-api',
      sourceBranch: 'feature/16184-tenant-settings',
      targetBranch: 'main',
      status: 'DRAFT',
      authorEmployeeId: EMP.youssef,
      reviewerEmployeeIds: [EMP.karim, EMP.ahmed],
      linkedWorkItemId: WORK_ITEM.tenantSettings,
      url: null,
      updatedAt: iso(40),
    },
    {
      id: PULL_REQUEST.dashboardFilters,
      organizationId: DEMO_ORGANIZATION_ID,
      provider: 'AZURE_DEVOPS',
      externalId: '501',
      title: 'Sprint health dashboard filters',
      repository: 'acme-web',
      sourceBranch: 'feature/16192-dashboard-filters',
      targetBranch: 'main',
      status: 'ACTIVE',
      authorEmployeeId: EMP.ahmed,
      reviewerEmployeeIds: [EMP.rana],
      linkedWorkItemId: WORK_ITEM.dashboardFilters,
      url: null,
      updatedAt: iso(55),
    },
  ];
}

export function createDemoBuilds(now: number): Build[] {
  return [
    {
      id: BUILD.frontendCi,
      organizationId: DEMO_ORGANIZATION_ID,
      provider: 'AZURE_DEVOPS',
      externalId: '245',
      pipelineName: 'Frontend CI',
      branch: 'main',
      status: 'RUNNING',
      triggeredByEmployeeId: EMP.youssef,
      startedAt: new Date(now - 3 * 60_000).toISOString(),
      finishedAt: null,
      url: null,
    },
    {
      id: BUILD.backendCi,
      organizationId: DEMO_ORGANIZATION_ID,
      provider: 'AZURE_DEVOPS',
      externalId: '246',
      pipelineName: 'Backend CI',
      branch: 'feature/16184-tenant-settings',
      status: 'QUEUED',
      triggeredByEmployeeId: EMP.youssef,
      startedAt: null,
      finishedAt: null,
      url: null,
    },
  ];
}

export function createDemoSprint(now: number): Sprint {
  const dayMs = 24 * 60 * 60_000;
  const start = new Date(now - 5 * dayMs);
  start.setHours(9, 0, 0, 0);
  return {
    id: 'sprint-24',
    name: 'Sprint 24',
    startAt: start.toISOString(),
    endAt: new Date(start.getTime() + 13 * dayMs).toISOString(),
    workItemCount: WORK_ITEM_SEEDS.length,
  };
}
