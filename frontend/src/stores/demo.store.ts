import { defineStore } from 'pinia';

export type DemoRunStatus = 'idle' | 'running' | 'paused';

interface DemoStoreState {
  status: DemoRunStatus;
  loop: boolean;
  cycle: number;
  elapsedMs: number;
  cycleLengthMs: number;
  lastStepLabel: string | null;
  nextStepLabel: string | null;
  /** Bumped on a hard reset so the office director re-syncs avatars instantly instead of walking. */
  hardResetToken: number;
}

/** Observable state of DemoSimulationService, for the demo control panel. */
export const useDemoStore = defineStore('demo', {
  state: (): DemoStoreState => ({
    status: 'idle',
    loop: true,
    cycle: 1,
    elapsedMs: 0,
    cycleLengthMs: 0,
    lastStepLabel: null,
    nextStepLabel: null,
    hardResetToken: 0,
  }),

  getters: {
    progress: (state): number => (state.cycleLengthMs > 0 ? Math.min(1, state.elapsedMs / state.cycleLengthMs) : 0),
  },
});
