import type {
  Build,
  Desk,
  Employee,
  Meeting,
  Office,
  OfficeFloor,
  PullRequest,
  Room,
  Sprint,
  Team,
  UUID,
  WorkItem,
} from '@virtual-office/shared';

import type { FeedItem } from '@/features/activity/activity-feed.types';
import type { OfficeMapDefinition } from '@/game/maps/office-map.types';
import type { AvatarAppearance } from '@/shared/utils/avatar-appearance';

/** Everything the office experience needs to render one floor. */
export interface OfficeSnapshot {
  organizationName: string;
  office: Office;
  floor: OfficeFloor;
  map: OfficeMapDefinition;
  rooms: Room[];
  desks: Desk[];
  teams: Team[];
  employees: Employee[];
  avatarAppearances: Record<UUID, Partial<AvatarAppearance>>;
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

const apiOfficeDataSource: OfficeDataSource = {
  kind: 'api',
  async load() {
    // TODO: compose from /api/offices, /api/employees, /api/meetings once those modules are backed by Supabase.
    throw new Error('The office API is not available yet. Start the frontend with VITE_DEMO_MODE=true to explore the demo office.');
  },
};

/** Demo data is imported lazily so it is never bundled into non-demo builds' main chunk. */
export async function resolveOfficeDataSource(demoMode: boolean): Promise<OfficeDataSource> {
  if (!demoMode) return apiOfficeDataSource;
  const { demoOfficeDataSource } = await import('@/demo/demo-office.data-source');
  return demoOfficeDataSource;
}
