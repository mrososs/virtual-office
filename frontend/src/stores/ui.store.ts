import type { UUID } from '@virtual-office/shared';
import { defineStore } from 'pinia';

import type { InteractionTarget } from '@/game/bridge/GameEvents';

export type Selection =
  | { kind: 'employee'; id: UUID }
  | { kind: 'room'; id: UUID }
  | { kind: 'desk'; id: UUID }
  | { kind: 'meeting'; id: UUID };

interface UiStoreState {
  selection: Selection | null;
  sidebarCollapsed: boolean;
  /** What the local player could interact with right now (drives the "Press E" prompt). */
  interaction: InteractionTarget | null;
  localRoomId: UUID | null;
  /** User-facing camera zoom; null until the camera picks a fit for the viewport. */
  zoom: number | null;
  cameraFollowingPlayer: boolean;
  localNavigationLabel: string | null;
  /** Employees currently driven by another connected browser (realtime). */
  liveEmployeeIds: UUID[];
}

export const useUiStore = defineStore('ui', {
  state: (): UiStoreState => ({
    selection: null,
    sidebarCollapsed: false,
    interaction: null,
    localRoomId: null,
    zoom: null,
    cameraFollowingPlayer: true,
    localNavigationLabel: null,
    liveEmployeeIds: [],
  }),

  getters: {
    isDrawerOpen: (state): boolean => state.selection !== null,
  },

  actions: {
    select(selection: Selection | null): void {
      this.selection = selection;
    },

    clearSelection(): void {
      this.selection = null;
    },

    toggleSidebar(): void {
      this.sidebarCollapsed = !this.sidebarCollapsed;
    },
  },
});
