import { findGameStation, GAME_STATIONS, GAME_TYPE_LABEL, type GameErrorCode, type GameStation } from '@virtual-office/shared';
import { computed, onBeforeUnmount, watch } from 'vue';

import { soundManager } from '@/core/audio';
import { useOfficeCommands } from '@/features/office/composables/useOfficeCommands';
import { GAME_EVENTS, gameBridge, type GameStationView } from '@/game/bridge';
import { useGameBridgeEvent } from '@/shared/composables';
import { firstNameOf } from '@/shared/utils/names';
import { useAuthStore } from '@/stores/auth.store';
import { useEmployeeStore } from '@/stores/employee.store';
import { useGameStore } from '@/stores/game.store';
import { useNotificationStore } from '@/stores/notification.store';
import { useOfficeStore } from '@/stores/office.store';
import { useUiStore } from '@/stores/ui.store';

import { gameRoomClient, subscribeGameRoom } from '../game-room.client';

/** Walking out of the Game Room while only waiting frees your place after this long (unless you come back). */
export const WALK_AWAY_RELEASE_MS = 20_000;

const ERROR_TITLE: Partial<Record<GameErrorCode, string>> = {
  STATION_FULL: 'The table is taken',
  ALREADY_AT_STATION: 'You are already at a table',
  ROOM_NOT_READY: 'Not ready yet',
  PROVIDER_UNAVAILABLE: 'The game could not be created',
  TIMED_OUT: 'Table freed',
  RATE_LIMITED: 'One moment',
};

/**
 * Keeps the Game Room in step while the office is open (one instance, from
 * the office experience):
 *
 *   socket  → game store     station occupancy, my session, refusals
 *   store   → Phaser         station chips; avatar keyboard lock only while internal Pong is on screen
 *   Phaser  → UI             table clicked / E pressed → station panel
 *   office  → server         sync after every (re)connect; leave the table when the office closes,
 *                            or shortly after walking out of the Game Room while only waiting
 */
export function useGameRoomSync(): void {
  const gameStore = useGameStore();
  const officeStore = useOfficeStore();
  const authStore = useAuthStore();
  const employeeStore = useEmployeeStore();
  const uiStore = useUiStore();
  const notifications = useNotificationStore();
  const { walkTo } = useOfficeCommands();

  const myStationId = computed(() => gameStore.stationIdOf(authStore.currentEmployeeId));
  const pongOnScreen = computed(() => gameStore.session?.kind === 'PONG');
  /** Only waiting (nobody to play with yet): walking away releases the place. Never once a game is on. */
  const onlyWaiting = computed(() => {
    const session = gameStore.session;
    if (!myStationId.value) return false;
    if (!session) return true;
    if (session.kind === 'EXTERNAL') return session.endReason === null && session.status !== 'IN_GAME';
    return session.status === 'ABANDONED';
  });

  const nameOf = (employeeId: string) => firstNameOf(employeeStore.byId(employeeId)?.displayName ?? 'Your opponent');

  const unsubscribe = subscribeGameRoom({
    onStations: (stations) => gameStore.setStations(stations),
    onStation: (station) => gameStore.upsertStation(station),
    onSession: (session) => {
      // An external game that ended for me: say why once, then let it go (no stale room link lingers).
      if (session?.kind === 'EXTERNAL' && session.endReason) {
        const station = findGameStation(session.stationId);
        const other = session.participants.find((id) => id !== authStore.currentEmployeeId) ?? (session.hostEmployeeId !== authStore.currentEmployeeId ? session.hostEmployeeId : null);
        if (session.endReason !== 'TIMED_OUT') {
          const who = other ? nameOf(other) : 'Your opponent';
          const why = session.endReason === 'OPPONENT_DISCONNECTED' ? `${who} disconnected` : `${who} left the table`;
          notifications.notify({ kind: 'GAME', tone: 'info', title: `${GAME_TYPE_LABEL[session.gameType]} session ended`, body: `${why} — the ${station?.name ?? 'table'} is free again.` });
        }
        gameStore.setSession(null);
        return;
      }
      gameStore.setSession(session);
    },
    onError: ({ code, message }) => {
      gameStore.pendingStationId = null;
      if (code === 'INVALID_INVITE') {
        gameStore.inviteError = message;
        return;
      }
      notifications.notify({ kind: 'GAME', tone: code === 'TIMED_OUT' ? 'info' : 'warning', title: ERROR_TITLE[code] ?? 'Game Room', body: message });
    },
  });

  watch(
    () => officeStore.realtimeStatus,
    (status) => {
      if (status === 'connected') gameRoomClient.sync();
      else gameStore.markUnsynced();
    },
    { immediate: true },
  );

  /* store → Phaser ------------------------------------------------------ */

  const stationViews = computed(() => GAME_STATIONS.map((station) => viewOf(station)));
  const sentViews = new Map<string, string>();

  function viewOf(station: GameStation): GameStationView {
    const state = gameStore.synced ? gameStore.stations[station.id] : undefined;
    const base = { stationId: station.id, title: GAME_TYPE_LABEL[station.gameType] };
    if (!state) return { ...base, detail: 'Offline', tone: 'free' };
    const count = `${state.participants.length}/${state.capacity}`;
    switch (state.status) {
      case 'AVAILABLE':
        return { ...base, detail: 'Available', tone: 'free' };
      case 'WAITING':
        return { ...base, detail: `${count} · ${state.joinable ? 'Waiting' : 'Setting up'}`, tone: 'waiting' };
      case 'READY':
        return { ...base, detail: `${count} · Ready`, tone: 'busy' };
      default:
        return { ...base, detail: `${count} · In game`, tone: 'busy' };
    }
  }

  function sendViews(force: boolean): void {
    for (const view of stationViews.value) {
      const key = JSON.stringify(view);
      if (!force && sentViews.get(view.stationId) === key) continue;
      sentViews.set(view.stationId, key);
      gameBridge.emit(GAME_EVENTS.SET_GAME_STATION, view);
    }
  }

  watch(stationViews, () => sendViews(false));
  watch(pongOnScreen, (open) => gameBridge.emit(GAME_EVENTS.SET_LOCAL_INPUT_ENABLED, { enabled: !open }));
  // A (re)built world starts with default chips and a free keyboard: bring it up to date.
  useGameBridgeEvent(GAME_EVENTS.OFFICE_LOADED, () => {
    sendViews(true);
    gameBridge.emit(GAME_EVENTS.SET_LOCAL_INPUT_ENABLED, { enabled: !pongOnScreen.value });
  });

  /* Phaser → UI ---------------------------------------------------------- */

  useGameBridgeEvent(GAME_EVENTS.STATION_CLICKED, ({ stationId }) => uiStore.select({ kind: 'station', id: stationId }));

  // A soft tick when you step up to a table (the prompt appears).
  watch(
    () => (uiStore.interaction?.kind === 'STATION' ? uiStore.interaction.id : null),
    (stationId) => {
      if (stationId) soundManager.play('station-near');
    },
  );

  // Took a place at a table: a confirmation chime, then walk to your end of it. Left one: a soft closing tone.
  watch(myStationId, (stationId, previous) => {
    if (!stationId && previous) soundManager.play('station-leave');
    if (!stationId || previous) return;
    soundManager.play('ui-success');
    const slot = gameStore.stationOf(stationId)?.participants.findIndex((participant) => participant.employeeId === authStore.currentEmployeeId) ?? 0;
    walkTo({ kind: 'STATION', stationId, slot: Math.max(0, slot) }, `Walking to the ${findGameStation(stationId)?.name ?? 'table'}`);
  });

  // The game begins: an opponent sat down at my external table, or an internal Pong match was found.
  watch(
    () => {
      const session = gameStore.session;
      if (!session) return null;
      return session.kind === 'EXTERNAL' ? (session.status === 'IN_GAME' ? `${session.sessionId}:in-game` : null) : session.status === 'READY' ? `${session.sessionId}:ready` : null;
    },
    (key, previous) => {
      if (!key || key === previous) return;
      soundManager.play('game-ready');
      const session = gameStore.session;
      if (session?.kind !== 'EXTERNAL' || session.hostEmployeeId !== authStore.currentEmployeeId) return;
      // The host is usually in the game's tab by now: a toast for when they look back, and the tab title meanwhile.
      const opponent = session.participants.find((id) => id !== authStore.currentEmployeeId);
      const who = opponent ? nameOf(opponent) : 'Your opponent';
      const station = findGameStation(session.stationId);
      notifications.notify({ kind: 'GAME', tone: 'success', title: `${who} joined your ${station?.name ?? 'table'}`, body: 'Your game is ready in the other tab.' });
      flagTitle(`● ${who} joined`);
    },
  );

  /** While the office tab is hidden, prefix its title so the change is visible from any tab. */
  let titleRestore: (() => void) | null = null;
  function flagTitle(prefix: string): void {
    if (!document.hidden || titleRestore) return;
    const original = document.title;
    document.title = `${prefix} — ${original}`;
    const restore = () => {
      if (document.hidden) return;
      document.title = original;
      document.removeEventListener('visibilitychange', restore);
      titleRestore = null;
    };
    titleRestore = restore;
    document.addEventListener('visibilitychange', restore);
  }

  // Walking out of the Game Room while only waiting releases the place after a short delay; coming back cancels it.
  let walkAwayTimer = 0;
  function cancelWalkAway(): void {
    window.clearTimeout(walkAwayTimer);
    walkAwayTimer = 0;
  }
  useGameBridgeEvent(GAME_EVENTS.PLAYER_LEFT_ROOM, ({ roomId }) => {
    const stationId = myStationId.value;
    const station = stationId ? findGameStation(stationId) : undefined;
    if (!stationId || station?.roomId !== roomId || !onlyWaiting.value || walkAwayTimer) return;
    notifications.notify({ kind: 'GAME', tone: 'info', title: `Still waiting at the ${station.name}?`, body: `Your place is released in ${WALK_AWAY_RELEASE_MS / 1000} s unless you come back to the Game Room.` });
    walkAwayTimer = window.setTimeout(() => {
      walkAwayTimer = 0;
      if (myStationId.value !== stationId || !onlyWaiting.value) return;
      gameRoomClient.leaveTable(stationId);
      gameStore.setSession(null);
      notifications.notify({ kind: 'GAME', tone: 'info', title: `You left the ${station.name}`, body: 'Leaving the Game Room freed your place at the table.' });
    }, WALK_AWAY_RELEASE_MS);
  });
  useGameBridgeEvent(GAME_EVENTS.PLAYER_ENTERED_ROOM, ({ roomId }) => {
    const station = myStationId.value ? findGameStation(myStationId.value) : undefined;
    if (station?.roomId === roomId) cancelWalkAway();
  });
  watch(onlyWaiting, (waiting) => {
    if (!waiting) cancelWalkAway();
  });

  // Leaving the office (another page, sign-out) leaves the table right away; closing the tab relies on the server's grace period.
  onBeforeUnmount(() => {
    cancelWalkAway();
    if (titleRestore) {
      document.removeEventListener('visibilitychange', titleRestore);
      titleRestore = null;
    }
    const stationId = myStationId.value;
    if (stationId) gameRoomClient.leaveTable(stationId);
    unsubscribe();
    // Occupancy is re-read on the next visit; never show a stale table meanwhile.
    gameStore.$reset();
  });
}
