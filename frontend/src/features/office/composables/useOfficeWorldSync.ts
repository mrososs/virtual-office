import {
  avatarAppearanceKey,
  normalizeAvatarProfile,
  resolveActivityPlacement,
  type Employee,
  type PlacementTarget,
  type UUID,
} from '@virtual-office/shared';
import { computed, shallowRef, toRaw, watch } from 'vue';

import {
  GAME_EVENTS,
  gameBridge,
  type EmployeeStatusView,
  type EmployeeWorldState,
  type OfficeInitPayload,
  type RealtimeOptions,
  type RoomMeetingState,
} from '@/game/bridge';
import { useGameBridgeEvent } from '@/shared/composables';
import { useAuthStore } from '@/stores/auth.store';
import { useDemoStore } from '@/stores/demo.store';
import { useEmployeeStore } from '@/stores/employee.store';
import { useMeetingStore } from '@/stores/meeting.store';
import { useOfficeStore } from '@/stores/office.store';
import { useRoomStore } from '@/stores/room.store';
import { useUiStore } from '@/stores/ui.store';

import { useStatusLookups } from './useStatusLookups';

/**
 * The office "director": the only Vue code that keeps the Phaser world in sync
 * with the stores (one-off UI commands go through useOfficeCommands).
 *
 *  stores ──(status / placement / meeting / selection diffs)──▶ GameBridge ▶ Phaser
 *  Phaser ──(clicks, room changes, camera, realtime)──────────▶ GameBridge ▶ stores
 *
 * Placement uses the shared domain policy (`resolveActivityPlacement`), so
 * where an activity puts someone is decided once, the same way the backend will.
 */
export function useOfficeWorldSync() {
  const employeeStore = useEmployeeStore();
  const meetingStore = useMeetingStore();
  const roomStore = useRoomStore();
  const officeStore = useOfficeStore();
  const uiStore = useUiStore();
  const authStore = useAuthStore();
  const demoStore = useDemoStore();
  const { statusLineOf } = useStatusLookups();

  const connected = shallowRef(false);
  const lastStatus = new Map<UUID, string>();
  const lastPlacement = new Map<UUID, string>();
  const lastRoomMeeting = new Map<UUID, string>();
  const lastAppearance = new Map<UUID, string>();

  const localEmployeeId = computed(() => authStore.currentEmployeeId);

  function statusView(employee: Employee): EmployeeStatusView {
    return {
      employeeId: employee.id,
      displayName: employee.displayName,
      presence: employee.presence.status,
      activity: employee.activity.type,
      statusLine: statusLineOf(employee),
    };
  }

  const statusViews = computed(() => employeeStore.all.map(statusView));

  /** Deterministic order + running room counts so equally-good rooms are shared fairly. */
  const placements = computed(() => {
    const assignedCountByRoomId: Record<UUID, number> = {};
    const result = new Map<UUID, PlacementTarget>();
    const people = [...employeeStore.all].sort((a, b) => a.id.localeCompare(b.id));
    for (const employee of people) {
      if (employee.id === localEmployeeId.value) continue;
      const placement = resolveActivityPlacement(employee, {
        rooms: roomStore.all,
        meetingsById: meetingStore.meetingsById,
        assignedCountByRoomId,
      });
      if (placement.kind === 'ROOM') assignedCountByRoomId[placement.roomId] = (assignedCountByRoomId[placement.roomId] ?? 0) + 1;
      result.set(employee.id, placement);
    }
    return result;
  });

  const roomMeetings = computed<RoomMeetingState[]>(() =>
    roomStore.all
      .filter((room) => room.type === 'MEETING')
      .map((room) => {
        const meeting = meetingStore.currentForRoom(room.id);
        return {
          roomId: room.id,
          meeting: meeting
            ? { meetingId: meeting.id, title: meeting.title, status: meeting.status, startAt: meeting.startAt, endAt: meeting.endAt }
            : null,
        };
      }),
  );

  /** Appearance changes are rare (a save, a teammate's live update): diffed by look key, never per frame. */
  const appearanceKeys = computed(() => new Map(employeeStore.all.map((employee) => [employee.id, avatarAppearanceKey(employeeStore.appearanceOf(employee.id))])));

  function worldState(employee: Employee): EmployeeWorldState {
    return {
      status: statusView(employee),
      appearance: employeeStore.appearanceOf(employee.id),
      placement: placements.value.get(employee.id) ?? { kind: 'HIDDEN' },
    };
  }

  function rememberSent(): void {
    lastStatus.clear();
    for (const view of statusViews.value) lastStatus.set(view.employeeId, JSON.stringify(view));
    lastPlacement.clear();
    for (const [id, placement] of placements.value) lastPlacement.set(id, JSON.stringify(placement));
    lastRoomMeeting.clear();
    for (const state of roomMeetings.value) lastRoomMeeting.set(state.roomId, JSON.stringify(state.meeting));
    lastAppearance.clear();
    for (const [id, key] of appearanceKeys.value) lastAppearance.set(id, key);
  }

  /** Sends the full world once Phaser reports GAME_READY and the data is loaded. */
  function sendInit(realtime: RealtimeOptions | null): void {
    const localId = localEmployeeId.value;
    const map = officeStore.map;
    const local = localId ? employeeStore.byId(localId) : undefined;
    if (!map || !local) throw new Error('Office data is not loaded');

    const payload: OfficeInitPayload = {
      map,
      rooms: roomStore.all.map((room) => toRaw(room)),
      desks: Object.values(roomStore.desksById).map((desk) => toRaw(desk)),
      localPlayer: worldState(local),
      localAvatar: toRaw(employeeStore.avatarProfileOf(local.id)) ?? null,
      employees: employeeStore.all.filter((employee) => employee.id !== localId).map(worldState),
      roomMeetings: roomMeetings.value,
      realtime,
      zoom: uiStore.zoom,
    };
    rememberSent();
    connected.value = true;
    gameBridge.emit(GAME_EVENTS.OFFICE_INIT, payload);
    sendSelection();
  }

  function sendSelection(): void {
    const selection = uiStore.selection;
    const meetingRoomId = selection?.kind === 'meeting' ? (meetingStore.byId(selection.id)?.roomId ?? null) : null;
    gameBridge.emit(GAME_EVENTS.SET_SELECTION, {
      employeeId: selection?.kind === 'employee' ? selection.id : null,
      roomId: selection?.kind === 'room' ? selection.id : meetingRoomId,
      deskId: selection?.kind === 'desk' ? selection.id : null,
    });
  }

  function disconnect(): void {
    connected.value = false;
  }

  /* stores -> Phaser ---------------------------------------------------- */

  watch(statusViews, (views) => {
    if (!connected.value) return;
    for (const view of views) {
      const key = JSON.stringify(view);
      if (lastStatus.get(view.employeeId) === key) continue;
      lastStatus.set(view.employeeId, key);
      gameBridge.emit(GAME_EVENTS.SET_EMPLOYEE_STATUS, view);
    }
  });

  watch(placements, (next) => {
    if (!connected.value) return;
    for (const [employeeId, placement] of next) {
      const key = JSON.stringify(placement);
      if (lastPlacement.get(employeeId) === key) continue;
      lastPlacement.set(employeeId, key);
      gameBridge.emit(GAME_EVENTS.MOVE_EMPLOYEE, { employeeId, placement });
    }
  });

  watch(appearanceKeys, (keys) => {
    if (!connected.value) return;
    for (const [employeeId, key] of keys) {
      if (lastAppearance.get(employeeId) === key) continue;
      lastAppearance.set(employeeId, key);
      gameBridge.emit(GAME_EVENTS.SET_EMPLOYEE_APPEARANCE, {
        employeeId,
        appearance: employeeStore.appearanceOf(employeeId),
        profile: toRaw(employeeStore.avatarProfileOf(employeeId)) ?? null,
      });
    }
  });

  watch(roomMeetings, (states) => {
    if (!connected.value) return;
    for (const state of states) {
      const key = JSON.stringify(state.meeting);
      if (lastRoomMeeting.get(state.roomId) === key) continue;
      lastRoomMeeting.set(state.roomId, key);
      gameBridge.emit(GAME_EVENTS.SET_ROOM_MEETING, state);
    }
  });

  watch(() => uiStore.selection, () => connected.value && sendSelection(), { deep: true });

  // A hard demo reset teleports everyone to their seeded place instead of walking.
  watch(
    () => demoStore.hardResetToken,
    () => {
      if (!connected.value) return;
      const localId = localEmployeeId.value;
      const local = localId ? employeeStore.byId(localId) : undefined;
      if (!local) return;
      rememberSent();
      gameBridge.emit(GAME_EVENTS.RESET_OFFICE, {
        employees: employeeStore.all.filter((employee) => employee.id !== localId).map(worldState),
        localPlayer: statusView(local),
        roomMeetings: roomMeetings.value,
      });
    },
    { flush: 'post' },
  );

  /* Phaser -> stores ---------------------------------------------------- */

  const selectMeetingInRoom = (roomId: UUID) => {
    const meeting = meetingStore.currentForRoom(roomId);
    uiStore.select(meeting ? { kind: 'meeting', id: meeting.id } : { kind: 'room', id: roomId });
  };

  useGameBridgeEvent(GAME_EVENTS.EMPLOYEE_CLICKED, ({ employeeId }) => uiStore.select({ kind: 'employee', id: employeeId }));
  useGameBridgeEvent(GAME_EVENTS.DESK_CLICKED, ({ deskId }) => uiStore.select({ kind: 'desk', id: deskId }));
  useGameBridgeEvent(GAME_EVENTS.ROOM_CLICKED, ({ roomId }) => uiStore.select({ kind: 'room', id: roomId }));
  useGameBridgeEvent(GAME_EVENTS.OPEN_MEETING_DETAILS, ({ roomId }) => selectMeetingInRoom(roomId));
  useGameBridgeEvent(GAME_EVENTS.MEETING_JOIN_REQUESTED, ({ roomId }) => selectMeetingInRoom(roomId));
  useGameBridgeEvent(GAME_EVENTS.BACKGROUND_CLICKED, () => uiStore.clearSelection());

  useGameBridgeEvent(GAME_EVENTS.EMPLOYEE_ROOM_CHANGED, ({ employeeId, roomId, previousRoomId }) => {
    roomStore.moveEmployee(employeeId, previousRoomId, roomId);
    employeeStore.setRoom(employeeId, { roomId, roomType: roomId ? (roomStore.byId(roomId)?.type ?? null) : null });
  });
  useGameBridgeEvent(GAME_EVENTS.PLAYER_ENTERED_ROOM, ({ roomId }) => (uiStore.localRoomId = roomId));
  useGameBridgeEvent(GAME_EVENTS.PLAYER_LEFT_ROOM, ({ roomId }) => {
    if (uiStore.localRoomId === roomId) uiStore.localRoomId = null;
  });
  useGameBridgeEvent(GAME_EVENTS.INTERACTION_AVAILABLE, ({ target }) => (uiStore.interaction = target));
  useGameBridgeEvent(GAME_EVENTS.CAMERA_CHANGED, ({ zoom, followingPlayer }) => {
    uiStore.zoom = zoom;
    uiStore.cameraFollowingPlayer = followingPlayer;
  });
  useGameBridgeEvent(GAME_EVENTS.LOCAL_NAVIGATION_CHANGED, ({ label }) => (uiStore.localNavigationLabel = label));
  useGameBridgeEvent(GAME_EVENTS.REALTIME_STATUS_CHANGED, ({ status }) => officeStore.setRealtimeStatus(status));
  useGameBridgeEvent(GAME_EVENTS.LIVE_EMPLOYEES_CHANGED, ({ employeeIds }) => (uiStore.liveEmployeeIds = employeeIds));
  // A teammate's look arrived over the socket: store it (UI badges update) and let the watcher above re-skin them.
  useGameBridgeEvent(GAME_EVENTS.REMOTE_AVATAR_RECEIVED, ({ employeeId, avatar }) => {
    if (employeeId === localEmployeeId.value || !employeeStore.byId(employeeId)) return;
    employeeStore.upsertAvatarProfile(normalizeAvatarProfile(avatar, employeeId));
  });

  return { sendInit, disconnect, connected };
}
