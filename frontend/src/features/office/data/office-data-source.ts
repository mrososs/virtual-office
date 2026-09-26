import type {
  AvatarProfile,
  Build,
  Desk,
  Employee,
  Meeting,
  Office,
  OfficeFloor,
  OfficeStateResponse,
  PullRequest,
  Room,
  Sprint,
  WorkItem,
} from '@virtual-office/shared';

import { ApiError, httpClient } from '@/core/api';
import type { FeedItem } from '@/features/activity/activity-feed.types';
import type { OfficeMapDefinition } from '@/game/maps/office-map.types';

import { composeOfficeSnapshot } from './compose-office-snapshot';

/** Everything the office experience needs to render one floor. */
export interface OfficeSnapshot {
  organizationName: string;
  office: Office;
  floor: OfficeFloor;
  map: OfficeMapDefinition;
  rooms: Room[];
  desks: Desk[];
  employees: Employee[];
  /** Saved looks of everyone who has created an avatar (the rest render with the default look). */
  avatarProfiles: AvatarProfile[];
  meetings: Meeting[];
  workItems: WorkItem[];
  pullRequests: PullRequest[];
  builds: Build[];
  sprint: Sprint | null;
  feed: FeedItem[];
}

export interface OfficeDataSource {
  readonly kind: 'demo' | 'api';
  load(): Promise<OfficeSnapshot>;
}

/** Production: the signed-in team from Supabase (members, presence, activity, avatars, synced Azure DevOps work). */
const apiOfficeDataSource: OfficeDataSource = {
  kind: 'api',
  async load() {
    try {
      return composeOfficeSnapshot(await httpClient.get<OfficeStateResponse>('/office/state'));
    } catch (error) {
      if (error instanceof ApiError && error.isNetworkError) throw new Error("Can't reach the Virtual Office server. Check your connection and retry.");
      if (error instanceof ApiError && error.status === 503) throw new Error('The Virtual Office is temporarily unavailable. Try again shortly.');
      throw error;
    }
  },
};

/** Demo data is imported lazily so it is never bundled into non-demo builds' main chunk. */
export async function resolveOfficeDataSource(demoMode: boolean): Promise<OfficeDataSource> {
  if (!demoMode) return apiOfficeDataSource;
  const { demoOfficeDataSource } = await import('@/demo/demo-office.data-source');
  return demoOfficeDataSource;
}
