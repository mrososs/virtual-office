import type { UUID } from '@virtual-office/shared';
import { useRoute, useRouter } from 'vue-router';

import { GAME_EVENTS, gameBridge, type NavigationRequest } from '@/game/bridge';
import { useUiStore } from '@/stores/ui.store';

/**
 * UI-initiated commands for the office world (camera, zoom, "walk me there").
 * Components call these instead of emitting bridge events ad hoc. When the
 * user is on another page, they are taken back to the office first.
 */
export function useOfficeCommands() {
  const router = useRouter();
  const route = useRoute();
  const uiStore = useUiStore();

  const onOffice = () => route.path.startsWith('/office');

  async function focusEmployee(employeeId: UUID, options: { select?: boolean } = {}): Promise<void> {
    if (options.select !== false) uiStore.select({ kind: 'employee', id: employeeId });
    if (!onOffice()) {
      await router.push({ name: 'office' });
      return;
    }
    gameBridge.emit(GAME_EVENTS.FOCUS_EMPLOYEE, { employeeId });
  }

  async function focusRoom(roomId: UUID): Promise<void> {
    if (!onOffice()) await router.push({ name: 'office' });
    else gameBridge.emit(GAME_EVENTS.FOCUS_ROOM, { roomId });
  }

  function walkTo(request: NavigationRequest, label: string): void {
    gameBridge.emit(GAME_EVENTS.NAVIGATE_LOCAL_PLAYER, { request, label });
  }

  function cancelWalk(): void {
    gameBridge.emit(GAME_EVENTS.CANCEL_LOCAL_NAVIGATION, undefined);
  }

  function setZoom(zoom: number): void {
    gameBridge.emit(GAME_EVENTS.SET_ZOOM, { zoom });
  }

  function recenter(): void {
    gameBridge.emit(GAME_EVENTS.RECENTER_CAMERA, undefined);
  }

  return { focusEmployee, focusRoom, walkTo, cancelWalk, setZoom, recenter };
}
