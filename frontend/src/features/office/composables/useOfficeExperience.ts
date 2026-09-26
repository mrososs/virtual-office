import { computed, onBeforeUnmount, shallowRef, watch } from 'vue';

import { runtimeEnv } from '@/core/config';
import { socketClient } from '@/core/socket';
import { useOfficeNarrator } from '@/features/activity/composables/useOfficeNarrator';
import { applyOfficeSnapshot } from '@/features/office/data/apply-office-snapshot';
import { resolveOfficeDataSource } from '@/features/office/data/office-data-source';
import { GAME_EVENTS, type RealtimeOptions } from '@/game/bridge';
import { useGameBridgeEvent } from '@/shared/composables';
import { useAuthStore } from '@/stores/auth.store';
import { useOfficeStore } from '@/stores/office.store';

import { useOfficeLiveUpdates } from './useOfficeLiveUpdates';
import { useOfficeWorldSync } from './useOfficeWorldSync';

export type OfficePhase = 'loading' | 'starting' | 'ready' | 'error';

/**
 * First-load sequence for /office:
 *   1. load the company snapshot (demo data source in demo mode)
 *   2. Phaser boots in parallel (OfficeCanvas) and reports GAME_READY
 *   3. once both are ready, the director sends OFFICE_INIT (map, rooms, desks, people, meetings)
 *   4. Phaser reports OFFICE_LOADED → the office is shown and the demo simulation starts
 * Data stays in the stores across route changes; only the canvas is rebuilt.
 */
export function useOfficeExperience() {
  const officeStore = useOfficeStore();
  const authStore = useAuthStore();
  const world = useOfficeWorldSync();
  useOfficeNarrator();
  if (!runtimeEnv.demoMode) useOfficeLiveUpdates();

  const gameReady = shallowRef(false);
  const initializing = shallowRef(false);
  const canvasKey = shallowRef(0);

  const phase = computed<OfficePhase>(() => {
    if (officeStore.dataStatus === 'error' || officeStore.gameStatus === 'error') return 'error';
    if (officeStore.dataStatus !== 'ready') return 'loading';
    return officeStore.gameStatus === 'ready' ? 'ready' : 'starting';
  });
  const errorMessage = computed(() => officeStore.dataError ?? officeStore.gameError ?? 'Something went wrong');

  // GAME_READY always comes from a fresh scene (first mount, retry, remount): it needs a full init.
  useGameBridgeEvent(GAME_EVENTS.GAME_READY, () => {
    world.disconnect();
    gameReady.value = true;
    void initializeWorld();
  });
  useGameBridgeEvent(GAME_EVENTS.OFFICE_LOADED, () => {
    officeStore.setGameStatus('ready');
    void startSimulation();
  });
  useGameBridgeEvent(GAME_EVENTS.GAME_ERROR, ({ message }) => officeStore.setGameStatus('error', message));

  watch(
    () => officeStore.dataStatus,
    (status) => {
      if (status === 'ready') void initializeWorld();
    },
  );

  async function loadData(): Promise<void> {
    if (officeStore.dataStatus === 'ready' || officeStore.dataStatus === 'loading') return;
    officeStore.setDataStatus('loading');
    try {
      const source = await resolveOfficeDataSource(runtimeEnv.demoMode);
      applyOfficeSnapshot(await source.load());
      officeStore.setDataStatus('ready');
    } catch (error) {
      officeStore.setDataStatus('error', error instanceof Error ? error.message : 'Could not load the office');
    }
  }

  async function initializeWorld(): Promise<void> {
    if (!gameReady.value || officeStore.dataStatus !== 'ready' || initializing.value || world.connected.value) return;
    initializing.value = true;
    try {
      world.sendInit(await resolveRealtime());
    } catch (error) {
      officeStore.setGameStatus('error', error instanceof Error ? error.message : 'Could not build the office');
    } finally {
      initializing.value = false;
    }
  }

  async function resolveRealtime(): Promise<RealtimeOptions | null> {
    const employeeId = authStore.currentEmployeeId;
    const officeId = officeStore.office?.id;
    if (!employeeId || !officeId) return null;

    if (!runtimeEnv.demoMode) {
      // The session cookie authenticates the socket; the server decides who we are.
      socketClient.setAuthToken(null);
      return { officeId, employeeId };
    }
    const { demoSessionService } = await import('@/demo/demo-session.service');
    const token = await demoSessionService.ensureRealtimeToken();
    return token ? { officeId, employeeId } : null;
  }

  async function startSimulation(): Promise<void> {
    if (!runtimeEnv.demoMode) return;
    const { demoSimulation } = await import('@/demo/simulation/demo-simulation.service');
    demoSimulation.start();
  }

  function retry(): void {
    if (officeStore.dataStatus === 'error') officeStore.setDataStatus('idle');
    officeStore.setGameStatus('idle');
    gameReady.value = false;
    world.disconnect();
    canvasKey.value += 1;
    void loadData();
  }

  onBeforeUnmount(() => {
    world.disconnect();
    if (officeStore.gameStatus !== 'error') officeStore.setGameStatus('idle');
  });

  void loadData();

  return { phase, errorMessage, canvasKey, retry };
}
