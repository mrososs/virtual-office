import type {
  Build,
  BuildStatus,
  PullRequest,
  PullRequestStatus,
  Sprint,
  UUID,
  WorkItem,
  WorkItemState,
} from '@virtual-office/shared';
import { defineStore } from 'pinia';

interface WorkStoreState {
  workItemsById: Record<UUID, WorkItem>;
  pullRequestsById: Record<UUID, PullRequest>;
  buildsById: Record<UUID, Build>;
  sprint: Sprint | null;
}

/** Azure DevOps-sourced work data (work items, pull requests, builds, sprint). */
export const useWorkStore = defineStore('work', {
  state: (): WorkStoreState => ({
    workItemsById: {},
    pullRequestsById: {},
    buildsById: {},
    sprint: null,
  }),

  getters: {
    workItem:
      (state) =>
      (id: UUID | undefined): WorkItem | undefined =>
        id ? state.workItemsById[id] : undefined,
    pullRequest:
      (state) =>
      (id: UUID | undefined): PullRequest | undefined =>
        id ? state.pullRequestsById[id] : undefined,
    build:
      (state) =>
      (id: UUID | undefined): Build | undefined =>
        id ? state.buildsById[id] : undefined,
    runningBuildCount: (state): number => Object.values(state.buildsById).filter((build) => build.status === 'RUNNING').length,
    openReviewCount: (state): number =>
      Object.values(state.pullRequestsById).filter((pullRequest) => pullRequest.status === 'ACTIVE').length,
    pullRequestsAuthoredBy:
      (state) =>
      (employeeId: UUID): PullRequest[] =>
        Object.values(state.pullRequestsById).filter(
          (pullRequest) => pullRequest.authorEmployeeId === employeeId && pullRequest.status !== 'COMPLETED',
        ),
    sprintDay: (state): { day: number; length: number } | null => {
      if (!state.sprint) return null;
      const dayMs = 24 * 60 * 60_000;
      const start = new Date(state.sprint.startAt).getTime();
      const length = Math.round((new Date(state.sprint.endAt).getTime() - start) / dayMs) + 1;
      const day = Math.min(length, Math.max(1, Math.floor((Date.now() - start) / dayMs) + 1));
      return { day, length };
    },
  },

  actions: {
    setAll(payload: { workItems: WorkItem[]; pullRequests: PullRequest[]; builds: Build[]; sprint: Sprint | null }): void {
      this.workItemsById = Object.fromEntries(payload.workItems.map((item) => [item.id, item]));
      this.pullRequestsById = Object.fromEntries(payload.pullRequests.map((item) => [item.id, item]));
      this.buildsById = Object.fromEntries(payload.builds.map((item) => [item.id, item]));
      this.sprint = payload.sprint;
    },

    setWorkItemState(id: UUID, state: WorkItemState): void {
      const item = this.workItemsById[id];
      if (!item) return;
      item.state = state;
      item.updatedAt = new Date().toISOString();
    },

    setPullRequestStatus(id: UUID, status: PullRequestStatus): void {
      const pullRequest = this.pullRequestsById[id];
      if (!pullRequest) return;
      pullRequest.status = status;
      pullRequest.updatedAt = new Date().toISOString();
    },

    setBuildStatus(id: UUID, status: BuildStatus): void {
      const build = this.buildsById[id];
      if (!build) return;
      const now = new Date().toISOString();
      build.status = status;
      if (status === 'RUNNING') {
        build.startedAt = now;
        build.finishedAt = null;
      } else if (status !== 'QUEUED') {
        build.finishedAt = now;
      }
    },

    upsertBuild(build: Build): void {
      this.buildsById[build.id] = build;
    },
  },
});
