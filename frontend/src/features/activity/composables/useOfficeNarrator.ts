import { GAME_TYPE_LABEL, findGameStation, type ActivityType, type BuildStatus, type GameStationStatus, type MeetingStatus, type PresenceStatus, type PullRequestStatus, type UUID, type WorkItemState } from '@virtual-office/shared';
import { nextTick, watch } from 'vue';

import { GAME_EVENTS } from '@/game/bridge';
import { useGameBridgeEvent } from '@/shared/composables';
import { firstNameOf } from '@/shared/utils/names';
import { useAuthStore } from '@/stores/auth.store';
import { useDemoStore } from '@/stores/demo.store';
import { useEmployeeStore } from '@/stores/employee.store';
import { useFeedStore } from '@/stores/feed.store';
import { useGameStore } from '@/stores/game.store';
import { useMeetingStore } from '@/stores/meeting.store';
import { useNotificationStore } from '@/stores/notification.store';
import { useRoomStore } from '@/stores/room.store';
import { useWorkStore } from '@/stores/work.store';

const WORK_STATE_LABEL: Record<WorkItemState, string> = {
  NEW: 'New',
  ACTIVE: 'Active',
  IN_REVIEW: 'In Review',
  BLOCKED: 'Blocked',
  RESOLVED: 'Resolved',
  CLOSED: 'Closed',
};

/**
 * Turns domain state transitions into the activity feed and toasts. It only
 * observes stores, so real integration events (Azure DevOps, Teams) will be
 * narrated exactly like the demo script. Baselines are re-taken on a hard
 * demo reset so a reset doesn't replay a burst of notifications.
 *
 * Chimes are opt-in per notification and only for what concerns this person
 * (their review request, their meeting, a failed build that is theirs or the
 * team's); everything else is silent. Sound is never the only signal.
 */
export function useOfficeNarrator(): void {
  const employeeStore = useEmployeeStore();
  const meetingStore = useMeetingStore();
  const workStore = useWorkStore();
  const roomStore = useRoomStore();
  const feed = useFeedStore();
  const notifications = useNotificationStore();
  const authStore = useAuthStore();
  const demoStore = useDemoStore();
  const gameStore = useGameStore();

  let muted = false;
  watch(
    () => demoStore.hardResetToken,
    () => {
      muted = true;
      void nextTick(() => nextTick(() => (muted = false)));
    },
    { flush: 'sync' },
  );

  const nameOf = (id: UUID | null | undefined) => (id ? firstNameOf(employeeStore.byId(id)?.displayName ?? 'Someone') : 'Someone');
  const roomName = (id: UUID | null) => (id ? (roomStore.byId(id)?.name ?? 'a meeting room') : 'a meeting room');

  onTransition(
    () => Object.fromEntries(Object.values(meetingStore.meetingsById).map((meeting) => [meeting.id, meeting.status])) as Record<UUID, MeetingStatus>,
    (meetingId, status) => {
      const meeting = meetingStore.byId(meetingId);
      if (!meeting) return;
      const where = roomName(meeting.roomId);
      const localId = authStore.currentEmployeeId;
      const attending = meeting.attendees.some((attendee) => attendee.employeeId === localId);
      if (status === 'STARTING_SOON') {
        feed.push({ kind: 'MEETING', tone: 'warning', actorEmployeeId: null, text: `${meeting.title} starts soon in ${where}`, meetingId });
        notifications.notify({
          kind: 'MEETING',
          tone: 'warning',
          title: `${meeting.title} is starting soon`,
          body: `${where} · Microsoft Teams`,
          action: attending && meeting.roomId ? { kind: 'WALK_TO_ROOM', label: 'Walk me there', roomId: meeting.roomId } : { kind: 'OPEN_MEETING', label: 'Details', meetingId },
          sound: attending ? 'NOTIFY' : undefined,
        });
      } else if (status === 'LIVE') {
        feed.push({ kind: 'MEETING', tone: 'info', actorEmployeeId: null, text: `${meeting.title} started in ${where}`, meetingId });
        notifications.notify({ kind: 'MEETING', tone: 'info', title: `${meeting.title} is live`, body: where, action: { kind: 'OPEN_MEETING', label: 'Open', meetingId } });
      } else if (status === 'ENDED') {
        feed.push({ kind: 'MEETING', tone: 'neutral', actorEmployeeId: null, text: `${meeting.title} ended`, meetingId });
      }
    },
  );

  onTransition(
    () => Object.fromEntries(Object.values(workStore.buildsById).map((build) => [build.id, build.status])) as Record<UUID, BuildStatus>,
    (buildId, status) => {
      const build = workStore.build(buildId);
      if (!build) return;
      const label = `#${build.externalId} · ${build.pipelineName}`;
      if (status === 'RUNNING') {
        feed.push({ kind: 'BUILD', tone: 'info', actorEmployeeId: build.triggeredByEmployeeId, text: `started build ${label}` });
      } else if (status === 'SUCCEEDED') {
        feed.push({ kind: 'BUILD', tone: 'success', actorEmployeeId: null, text: `Build ${label} passed` });
        notifications.notify({ kind: 'BUILD', tone: 'success', title: `Build #${build.externalId} passed`, body: `${build.pipelineName} · ${build.branch}` });
      } else if (status === 'FAILED') {
        feed.push({ kind: 'BUILD', tone: 'danger', actorEmployeeId: null, text: `Build ${label} failed` });
        const concernsMe = build.triggeredByEmployeeId === null || build.triggeredByEmployeeId === authStore.currentEmployeeId;
        notifications.notify({ kind: 'BUILD', tone: 'danger', title: `Build #${build.externalId} failed`, body: build.pipelineName, sound: concernsMe ? 'ALERT' : undefined });
      }
    },
  );

  onTransition(
    () => Object.fromEntries(Object.values(workStore.pullRequestsById).map((pr) => [pr.id, pr.status])) as Record<UUID, PullRequestStatus>,
    (pullRequestId, status, previous) => {
      const pr = workStore.pullRequest(pullRequestId);
      if (!pr) return;
      if (status === 'ACTIVE' && previous === 'DRAFT') {
        feed.push({ kind: 'PULL_REQUEST', tone: 'warning', actorEmployeeId: pr.authorEmployeeId, text: `opened PR #${pr.externalId} for review` });
        notifications.notify({
          kind: 'PULL_REQUEST',
          tone: 'warning',
          title: `PR #${pr.externalId} is ready for review`,
          body: pr.title,
          action: pr.reviewerEmployeeIds[0] ? { kind: 'OPEN_EMPLOYEE', label: `Reviewer: ${nameOf(pr.reviewerEmployeeIds[0])}`, employeeId: pr.reviewerEmployeeIds[0] } : undefined,
          sound: authStore.currentEmployeeId && pr.reviewerEmployeeIds.includes(authStore.currentEmployeeId) ? 'NOTIFY' : undefined,
        });
      } else if (status === 'APPROVED') {
        const reviewer = pr.reviewerEmployeeIds[0] ?? null;
        feed.push({ kind: 'PULL_REQUEST', tone: 'success', actorEmployeeId: reviewer, text: `approved PR #${pr.externalId}` });
        notifications.notify({
          kind: 'PULL_REQUEST',
          tone: 'success',
          title: `PR #${pr.externalId} approved`,
          body: `${pr.title} · by ${nameOf(reviewer)}`,
          sound: pr.authorEmployeeId === authStore.currentEmployeeId ? 'SUCCESS' : undefined,
        });
      }
    },
  );

  onTransition(
    () => Object.fromEntries(Object.values(workStore.workItemsById).map((item) => [item.id, item.state])) as Record<UUID, WorkItemState>,
    (workItemId, state) => {
      const item = workStore.workItem(workItemId);
      if (item) feed.push({ kind: 'WORK_ITEM', tone: state === 'BLOCKED' ? 'danger' : 'neutral', actorEmployeeId: item.assignedEmployeeId, text: `moved #${item.externalId} to ${WORK_STATE_LABEL[state]}` });
    },
  );

  onTransition(
    () => Object.fromEntries(employeeStore.all.map((employee) => [employee.id, employee.activity.type])) as Record<UUID, ActivityType>,
    (employeeId, activity) => {
      const employee = employeeStore.byId(employeeId);
      if (!employee) return;
      if (activity === 'CODE_REVIEW') {
        const pr = workStore.pullRequest(employee.activity.pullRequestId);
        feed.push({ kind: 'PULL_REQUEST', tone: 'warning', actorEmployeeId: employeeId, text: pr ? `started reviewing PR #${pr.externalId}` : 'started a code review' });
      } else if (activity === 'BREAK') {
        feed.push({ kind: 'LOCATION', tone: 'neutral', actorEmployeeId: employeeId, text: 'is taking a break' });
      } else if (activity === 'FOCUS') {
        feed.push({ kind: 'LOCATION', tone: 'neutral', actorEmployeeId: employeeId, text: 'started focus time' });
      }
    },
  );

  onTransition(
    () => Object.fromEntries(employeeStore.all.map((employee) => [employee.id, employee.presence.status])) as Record<UUID, PresenceStatus>,
    (employeeId, status) => {
      feed.push({ kind: 'PRESENCE', tone: 'neutral', actorEmployeeId: employeeId, text: status === 'OFFLINE' ? 'went offline' : 'came online' });
    },
  );

  // Game Room: one line when someone starts waiting, one when a game starts and one when it ends —
  // never per move or point, and never a room link.
  const lastPlayers = new Map<string, UUID[]>();
  onTransition(
    () => Object.fromEntries(Object.values(gameStore.stations).map((station) => [station.stationId, station.joinable ? 'OPEN' : 'CLOSED'])) as Record<string, 'OPEN' | 'CLOSED'>,
    (stationId, openness) => {
      const station = gameStore.stationOf(stationId);
      const host = station?.participants[0]?.employeeId;
      if (openness !== 'OPEN' || station?.status !== 'WAITING' || !host) return;
      feed.push({ kind: 'GAME', tone: 'neutral', actorEmployeeId: host, text: `is waiting for ${GAME_TYPE_LABEL[findGameStation(stationId)?.gameType ?? 'PONG']}` });
    },
  );
  onTransition(
    () => Object.fromEntries(Object.values(gameStore.stations).map((station) => [station.stationId, station.status])) as Record<string, GameStationStatus>,
    (stationId, status, previous) => {
      const station = gameStore.stationOf(stationId);
      const game = GAME_TYPE_LABEL[findGameStation(stationId)?.gameType ?? 'PONG'];
      if (status === 'IN_GAME' && previous !== 'IN_GAME' && station) {
        const [first, second] = station.participants.map((participant) => participant.employeeId);
        lastPlayers.set(stationId, [first, second].filter((id): id is UUID => !!id));
        feed.push({ kind: 'GAME', tone: 'neutral', actorEmployeeId: first ?? null, text: second ? `and ${nameOf(second)} started ${game}` : `started ${game}` });
      } else if (previous === 'IN_GAME' && status !== 'IN_GAME') {
        const players = lastPlayers.get(stationId) ?? [];
        feed.push({ kind: 'GAME', tone: 'neutral', actorEmployeeId: null, text: players.length === 2 ? `${game} game ended · ${players.map(nameOf).join(' & ')}` : `${game} game ended` });
      }
    },
  );

  useGameBridgeEvent(GAME_EVENTS.EMPLOYEE_ARRIVED, ({ employeeId, placement }) => {
    if (muted || placement.kind !== 'ROOM') return;
    const room = roomStore.byId(placement.roomId);
    if (room?.type !== 'MEETING' || !meetingStore.currentForRoom(room.id)) return;
    notifications.notify({ kind: 'LOCATION', tone: 'info', title: `${nameOf(employeeId)} entered ${room.name}`, action: { kind: 'OPEN_EMPLOYEE', label: 'View', employeeId } });
  });

  function onTransition<T extends string>(source: () => Record<string, T>, narrate: (id: string, next: T, previous: T) => void): void {
    watch(source, (next, previous) => {
      if (muted || !previous) return;
      for (const [id, value] of Object.entries(next)) {
        const before = previous[id];
        if (before !== undefined && before !== value) narrate(id, value, before);
      }
    });
  }
}
