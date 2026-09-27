import type { UUID } from '@virtual-office/shared';
import { onBeforeUnmount, watch } from 'vue';

import { soundManager } from '@/core/audio';
import { firstNameOf } from '@/shared/utils/names';
import { useAuthStore } from '@/stores/auth.store';
import { useCollaborationStore } from '@/stores/collaboration.store';
import { useEmployeeStore } from '@/stores/employee.store';
import { useNotificationStore } from '@/stores/notification.store';
import { useOfficeStore } from '@/stores/office.store';
import { useRoomStore } from '@/stores/room.store';
import { useUiStore } from '@/stores/ui.store';

import { liveRoomsClient, subscribeLiveRooms } from '../live-rooms.client';

/** The same teammate arriving again within this window (doorway back-and-forth) is not announced twice. */
const JOIN_TOAST_COOLDOWN_MS = 2 * 60_000;

/**
 * Keeps the live rooms in step while the office is open (one instance):
 *   my avatar's room      → server (player:room), again after every reconnect
 *   server occupancy      → collaboration store (the only source for Teams group calls)
 *   meeting-room sessions → collaboration store
 * and announces teammates who join the collaboration room I'm in — a toast
 * with a "Start Teams Call" button and a soft cue. Nothing ever opens Teams
 * by itself: entering a room only prepares the room's actions.
 */
export function useLiveRoomsSync(): void {
  const collaborationStore = useCollaborationStore();
  const officeStore = useOfficeStore();
  const uiStore = useUiStore();
  const roomStore = useRoomStore();
  const employeeStore = useEmployeeStore();
  const authStore = useAuthStore();
  const notifications = useNotificationStore();

  const announcedAt = new Map<string, number>();
  const roomTypeOf = (roomId: UUID | null) => (roomId ? roomStore.byId(roomId)?.type : undefined);

  const unsubscribe = subscribeLiveRooms({
    onSnapshot: (rooms) => collaborationStore.setSnapshot(rooms),
    onRoom: (room) => {
      const before = new Set(collaborationStore.occupantsOf(room.roomId));
      collaborationStore.setRoom(room);
      const myRoom = uiStore.localRoomId;
      const me = authStore.currentEmployeeId;
      if (room.roomId !== myRoom || !me || !room.employeeIds.includes(me) || !before.has(me)) return;
      for (const employeeId of room.employeeIds) {
        if (employeeId === me || before.has(employeeId)) continue;
        announceArrival(room.roomId, employeeId);
      }
    },
    onSessions: (sessions) => collaborationStore.setSessions(sessions),
    onSession: (roomId, session) => {
      const hadSession = !!collaborationStore.sessionOf(roomId);
      collaborationStore.setSession(roomId, session);
      if (session && !hadSession && roomId === uiStore.localRoomId && session.createdBy !== authStore.currentEmployeeId) soundManager.play('room-teammate');
    },
    onError: ({ message }) => (collaborationStore.meetingError = message),
  });

  function announceArrival(roomId: UUID, employeeId: UUID): void {
    const key = `${roomId}:${employeeId}`;
    const now = Date.now();
    if (now - (announcedAt.get(key) ?? Number.NEGATIVE_INFINITY) < JOIN_TOAST_COOLDOWN_MS) return;
    announcedAt.set(key, now);
    soundManager.play('room-teammate');
    if (roomTypeOf(roomId) !== 'CODE_REVIEW') return;
    const name = firstNameOf(employeeStore.byId(employeeId)?.displayName ?? 'A teammate');
    const room = roomStore.byId(roomId)?.name ?? 'the collaboration room';
    notifications.notify({ kind: 'LOCATION', tone: 'info', title: `${name} joined ${room}`, action: { kind: 'TEAMS_GROUP_CALL', label: 'Start Teams Call', roomId } });
  }

  // Report my avatar's room whenever it changes, and again after every (re)connect.
  watch(
    () => uiStore.localRoomId,
    (roomId) => liveRoomsClient.reportRoom(roomId),
  );
  watch(
    () => officeStore.realtimeStatus,
    (status) => {
      if (status === 'connected') liveRoomsClient.reportRoom(uiStore.localRoomId);
      else collaborationStore.markUnsynced();
    },
    { immediate: true },
  );

  onBeforeUnmount(() => {
    liveRoomsClient.reportRoom(null);
    unsubscribe();
    collaborationStore.$reset();
  });
}
