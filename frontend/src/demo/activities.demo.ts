import type { FeedItem } from '@/features/activity/activity-feed.types';

import { EMP, MEETING } from './demo.ids';

/** Feed history that "already happened" before the demo opened. */
export function createDemoFeedHistory(now: number): FeedItem[] {
  const ago = (minutes: number) => new Date(now - minutes * 60_000).toISOString();
  return [
    { id: 'feed-seed-6', at: ago(3), kind: 'BUILD', tone: 'info', actorEmployeeId: EMP.youssef, text: 'started build #245 · Frontend CI' },
    { id: 'feed-seed-5', at: ago(10), kind: 'MEETING', tone: 'info', actorEmployeeId: null, text: 'Release Readiness Review started in Meeting Room 2', meetingId: MEETING.releaseReview },
    { id: 'feed-seed-4', at: ago(12), kind: 'WORK_ITEM', tone: 'danger', actorEmployeeId: EMP.tamer, text: 'flagged #16188 as blocked' },
    { id: 'feed-seed-3', at: ago(15), kind: 'PULL_REQUEST', tone: 'warning', actorEmployeeId: EMP.omar, text: 'started reviewing PR #493' },
    { id: 'feed-seed-2', at: ago(22), kind: 'WORK_ITEM', tone: 'neutral', actorEmployeeId: EMP.mohamed, text: 'moved #16178 to Active' },
    { id: 'feed-seed-1', at: ago(35), kind: 'PRESENCE', tone: 'neutral', actorEmployeeId: EMP.ali, text: 'went offline' },
  ];
}
