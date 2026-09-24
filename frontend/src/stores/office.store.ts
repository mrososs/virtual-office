import type { Office, OfficeFloor, Team, UUID } from '@virtual-office/shared';
import { defineStore } from 'pinia';
import { markRaw } from 'vue';

import type { RealtimeConnectionStatus } from '@/game/bridge/GameEvents';
import type { OfficeMapDefinition } from '@/game/maps/office-map.types';

export type OfficeLoadStatus = 'idle' | 'loading' | 'ready' | 'error';
export type GameStatus = 'idle' | 'booting' | 'ready' | 'error';

interface OfficeStoreState {
  organizationName: string;
  office: Office | null;
  floor: OfficeFloor | null;
  teamsById: Record<UUID, Team>;
  /** Static layout handed to Phaser; kept raw so Vue never deep-proxies it. */
  map: OfficeMapDefinition | null;
  dataStatus: OfficeLoadStatus;
  dataError: string | null;
  gameStatus: GameStatus;
  gameError: string | null;
  realtimeStatus: RealtimeConnectionStatus;
}

export const useOfficeStore = defineStore('office', {
  state: (): OfficeStoreState => ({
    organizationName: '',
    office: null,
    floor: null,
    teamsById: {},
    map: null,
    dataStatus: 'idle',
    dataError: null,
    gameStatus: 'idle',
    gameError: null,
    realtimeStatus: 'disabled',
  }),

  getters: {
    isReady: (state): boolean => state.dataStatus === 'ready' && state.gameStatus === 'ready',
    teamName:
      (state) =>
      (teamId: UUID | null | undefined): string | null =>
        (teamId && state.teamsById[teamId]?.name) || null,
  },

  actions: {
    setOffice(payload: { organizationName: string; office: Office; floor: OfficeFloor; teams: Team[]; map: OfficeMapDefinition }): void {
      this.organizationName = payload.organizationName;
      this.office = payload.office;
      this.floor = payload.floor;
      this.teamsById = Object.fromEntries(payload.teams.map((team) => [team.id, team]));
      this.map = markRaw(payload.map);
    },

    setDataStatus(status: OfficeLoadStatus, error: string | null = null): void {
      this.dataStatus = status;
      this.dataError = error;
    },

    setGameStatus(status: GameStatus, error: string | null = null): void {
      this.gameStatus = status;
      this.gameError = error;
    },

    setRealtimeStatus(status: RealtimeConnectionStatus): void {
      this.realtimeStatus = status;
    },
  },
});
