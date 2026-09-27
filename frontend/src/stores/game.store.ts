import { findGameStation, GAME_TYPE_LABEL, type GameSession, type GameStationState, type UUID } from '@virtual-office/shared';
import { defineStore } from 'pinia';

interface GameStoreState {
  /** Server-authoritative occupancy per station. Empty until the first sync of a connection. */
  stations: Record<string, GameStationState>;
  /** My game at a station as the server last described it (an ended one stays until dismissed). */
  session: GameSession | null;
  /** performance.now() when `session` arrived: its countdown/expiry ms count from here. */
  sessionReceivedAt: number;
  /** Stations are known for the current connection. */
  synced: boolean;
  /** A join/leave/share request is on its way (buttons show progress, double clicks do nothing). */
  pendingStationId: string | null;
  /** The last refusal for a room link/code, shown next to the field. */
  inviteError: string | null;
}

/**
 * Game Room state for the UI: station occupancy and my game session. All of
 * it is low-frequency coordination — external providers run the games, and
 * internal Pong snapshots (when that engine is used) never pass through Vue.
 */
export const useGameStore = defineStore('game', {
  state: (): GameStoreState => ({
    stations: {},
    session: null,
    sessionReceivedAt: 0,
    synced: false,
    pendingStationId: null,
    inviteError: null,
  }),

  getters: {
    stationOf: (state) => (stationId: string): GameStationState | undefined => state.stations[stationId],

    /** The station an employee is at (waiting or playing), if any. */
    stationIdOf: (state) => (employeeId: UUID | null): string | null => {
      if (!employeeId) return null;
      for (const station of Object.values(state.stations)) {
        if (station.participants.some((participant) => participant.employeeId === employeeId)) return station.stationId;
      }
      return null;
    },

    /** Temporary social context for an avatar's status line ("Playing Chess"). Never stored as activity. */
    contextLabelOf: (state) => (employeeId: UUID): string | null => {
      for (const station of Object.values(state.stations)) {
        if (!station.participants.some((participant) => participant.employeeId === employeeId)) continue;
        const game = GAME_TYPE_LABEL[findGameStation(station.stationId)?.gameType ?? 'PONG'];
        return station.status === 'WAITING' ? `Waiting for ${game}` : `Playing ${game}`;
      }
      return null;
    },
  },

  actions: {
    setStations(stations: GameStationState[]): void {
      this.stations = Object.fromEntries(stations.map((station) => [station.stationId, station]));
      this.synced = true;
    },

    upsertStation(station: GameStationState): void {
      this.stations = { ...this.stations, [station.stationId]: station };
      if (this.pendingStationId === station.stationId) this.pendingStationId = null;
    },

    setSession(session: GameSession | null): void {
      this.session = session;
      this.sessionReceivedAt = performance.now();
      this.pendingStationId = null;
      if (session?.kind === 'EXTERNAL' && session.status !== 'SETUP') this.inviteError = null;
    },

    /** Connection lost: occupancy is unknown until the next sync (the session itself waits on the server). */
    markUnsynced(): void {
      this.synced = false;
      this.pendingStationId = null;
    },
  },
});
