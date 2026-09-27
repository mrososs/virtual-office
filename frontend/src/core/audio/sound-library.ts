import { bell, lowpass, noiseBuffer, noiseHit, seededRng, tone, type Rng } from './synth';

/** Mixer channels. Each has its own volume in Settings → Sound, under the master volume. */
export type SoundCategory = 'environment' | 'movement' | 'ui' | 'notifications' | 'games';

export type SoundId =
  | 'footstep'
  | 'ui-open'
  | 'ui-success'
  | 'notify'
  | 'notify-alert'
  | 'room-game'
  | 'room-meeting'
  | 'room-office'
  | 'room-collaboration'
  | 'game-ready'
  | 'station-near'
  | 'station-leave'
  | 'pong-hit'
  | 'pong-wall'
  | 'pong-score-for'
  | 'pong-score-against'
  | 'countdown-tick'
  | 'countdown-go'
  | 'game-win'
  | 'game-lose';

export type LoopId = 'game-room-ambience';

interface Recipe {
  /** Rendered length in seconds (loops: plus `loopCrossfade`). */
  duration: number;
  /** Lower rates for soft, dark sounds keep the bank small. */
  sampleRate?: number;
  build(ctx: OfflineAudioContext, variant: number, rng: Rng): void;
}

export interface SoundDefinition extends Recipe {
  category: SoundCategory;
  /** Renders this many takes; each play picks one (footsteps never sound mechanical). */
  variants?: number;
  /** Plays closer together than this are dropped (anti-spam). */
  minIntervalMs?: number;
  /** ± random playback-rate change per play. */
  rateJitter?: number;
}

export interface LoopDefinition extends Recipe {
  category: SoundCategory;
  loopCrossfade: number;
}

const note = (name: keyof typeof NOTES) => NOTES[name];
const NOTES = {
  C4: 261.63,
  D4: 293.66,
  E4: 329.63,
  G4: 392,
  A4: 440,
  B4: 493.88,
  C5: 523.25,
  D5: 587.33,
  E5: 659.25,
  G5: 783.99,
  A5: 880,
  B5: 987.77,
  C6: 1046.5,
  D6: 1174.66,
  E6: 1318.51,
  G6: 1567.98,
} as const;

function arpeggio(ctx: OfflineAudioContext, notes: number[], spacing: number, decay: number, gain: number): void {
  notes.forEach((freq, index) => bell(ctx, { freq, start: index * spacing, decay, gain }));
}

/**
 * Every one-shot sound. All are synthesized here — tune a sound by editing
 * its recipe. Levels are deliberately low: the category and master volumes
 * scale them further (office app, not an arcade).
 */
export const SOUND_LIBRARY: Readonly<Record<SoundId, SoundDefinition>> = {
  footstep: {
    category: 'movement',
    variants: 4,
    rateJitter: 0.06,
    duration: 0.16,
    build(ctx, variant, rng) {
      // Soft soles on carpet: a muffled heel thump, the body of the step, a light toe scuff.
      const soft = lowpass(ctx, 2600);
      tone(ctx, { freq: 118 + variant * 7, to: 58, attack: 0.003, decay: 0.07, gain: 0.32, destination: soft });
      noiseHit(ctx, { start: 0.002, attack: 0.002, decay: 0.065, gain: 0.5, filter: 'bandpass', freq: 520 + variant * 85 + rng() * 60, q: 0.8, rng, destination: soft });
      noiseHit(ctx, { start: 0.034 + rng() * 0.012, attack: 0.004, decay: 0.045, gain: 0.16, filter: 'bandpass', freq: 1500 + rng() * 300, q: 0.7, rng, destination: soft });
    },
  },
  'ui-open': {
    category: 'ui',
    minIntervalMs: 120,
    duration: 0.2,
    build(ctx) {
      tone(ctx, { type: 'triangle', freq: 660, to: 990, attack: 0.004, decay: 0.08, gain: 0.16 });
      tone(ctx, { freq: 1320, start: 0.02, attack: 0.003, decay: 0.06, gain: 0.04 });
    },
  },
  'ui-success': {
    category: 'ui',
    minIntervalMs: 250,
    duration: 0.65,
    build(ctx) {
      bell(ctx, { freq: note('G5'), decay: 0.35, gain: 0.15 });
      bell(ctx, { freq: note('D6'), start: 0.075, decay: 0.45, gain: 0.13 });
    },
  },
  notify: {
    category: 'notifications',
    minIntervalMs: 4000,
    duration: 1.15,
    build(ctx) {
      bell(ctx, { freq: note('A5'), decay: 0.7, gain: 0.19 });
      bell(ctx, { freq: note('E6'), start: 0.13, decay: 0.9, gain: 0.16 });
    },
  },
  'notify-alert': {
    category: 'notifications',
    minIntervalMs: 4000,
    duration: 1.05,
    build(ctx) {
      bell(ctx, { freq: note('E5'), decay: 0.5, gain: 0.19 });
      bell(ctx, { freq: note('B4'), start: 0.16, decay: 0.75, gain: 0.19 });
    },
  },
  'room-game': {
    category: 'environment',
    duration: 0.55,
    build(ctx) {
      [note('C6'), note('E6'), note('G6')].forEach((freq, index) => {
        tone(ctx, { type: 'triangle', freq, start: index * 0.06, attack: 0.003, decay: 0.2, gain: 0.07 });
      });
    },
  },
  'room-meeting': {
    category: 'environment',
    duration: 0.6,
    build(ctx) {
      tone(ctx, { freq: note('G4'), attack: 0.004, decay: 0.42, gain: 0.15 });
      tone(ctx, { freq: note('G4') * 4, attack: 0.002, decay: 0.06, gain: 0.035 });
    },
  },
  'room-office': {
    category: 'environment',
    duration: 0.65,
    build(ctx) {
      tone(ctx, { freq: note('D4'), attack: 0.005, decay: 0.35, gain: 0.13 });
      tone(ctx, { freq: note('A4'), start: 0.09, attack: 0.005, decay: 0.42, gain: 0.1 });
    },
  },
  'room-collaboration': {
    category: 'environment',
    duration: 0.6,
    build(ctx) {
      bell(ctx, { freq: note('C5'), decay: 0.3, gain: 0.11 });
      bell(ctx, { freq: note('G5'), start: 0.07, decay: 0.35, gain: 0.09 });
    },
  },
  'game-ready': {
    category: 'games',
    minIntervalMs: 1000,
    duration: 0.8,
    build(ctx) {
      arpeggio(ctx, [note('C5'), note('E5'), note('G5'), note('C6')], 0.07, 0.35, 0.13);
    },
  },
  'station-near': {
    category: 'games',
    minIntervalMs: 1500,
    duration: 0.22,
    build(ctx) {
      tone(ctx, { freq: note('E5'), attack: 0.004, decay: 0.12, gain: 0.07 });
      tone(ctx, { freq: note('B5'), start: 0.05, attack: 0.004, decay: 0.12, gain: 0.05 });
    },
  },
  'station-leave': {
    category: 'games',
    minIntervalMs: 800,
    duration: 0.45,
    build(ctx) {
      tone(ctx, { type: 'triangle', freq: note('G5'), to: note('D5'), attack: 0.005, decay: 0.28, gain: 0.12 });
    },
  },
  'pong-hit': {
    category: 'games',
    rateJitter: 0.03,
    duration: 0.12,
    build(ctx) {
      tone(ctx, { type: 'triangle', freq: 520, to: 470, attack: 0.002, decay: 0.07, gain: 0.28 });
    },
  },
  'pong-wall': {
    category: 'games',
    rateJitter: 0.03,
    duration: 0.1,
    build(ctx) {
      tone(ctx, { type: 'triangle', freq: 300, to: 280, attack: 0.002, decay: 0.05, gain: 0.2 });
    },
  },
  'pong-score-for': {
    category: 'games',
    duration: 0.42,
    build(ctx) {
      tone(ctx, { type: 'triangle', freq: note('C5'), to: note('G5'), attack: 0.005, decay: 0.28, gain: 0.2 });
    },
  },
  'pong-score-against': {
    category: 'games',
    duration: 0.48,
    build(ctx) {
      tone(ctx, { type: 'triangle', freq: note('G4'), to: note('C4'), attack: 0.005, decay: 0.32, gain: 0.18 });
    },
  },
  'countdown-tick': {
    category: 'games',
    duration: 0.3,
    build(ctx) {
      bell(ctx, { freq: note('E5'), decay: 0.18, gain: 0.15 });
    },
  },
  'countdown-go': {
    category: 'games',
    duration: 0.5,
    build(ctx) {
      bell(ctx, { freq: note('B5'), decay: 0.35, gain: 0.19 });
    },
  },
  'game-win': {
    category: 'games',
    duration: 1.15,
    build(ctx) {
      arpeggio(ctx, [note('C5'), note('E5'), note('G5'), note('C6'), note('E6')], 0.08, 0.5, 0.12);
    },
  },
  'game-lose': {
    category: 'games',
    duration: 1.05,
    build(ctx) {
      [note('G4'), note('E4'), note('C4')].forEach((freq, index) => tone(ctx, { freq, start: index * 0.14, attack: 0.005, decay: 0.45, gain: 0.13 }));
    },
  },
};

const AMBIENCE_SECONDS = 12;

export const LOOP_LIBRARY: Readonly<Record<LoopId, LoopDefinition>> = {
  // Quiet room tone with a few far-away arcade chirps and their echo.
  'game-room-ambience': {
    category: 'environment',
    sampleRate: 22_050,
    loopCrossfade: 1,
    duration: AMBIENCE_SECONDS + 1,
    build(ctx, _variant, rng) {
      const air = ctx.createBufferSource();
      air.buffer = noiseBuffer(ctx, AMBIENCE_SECONDS + 1, rng);
      const airGain = ctx.createGain();
      airGain.gain.value = 0.05;
      air.connect(lowpass(ctx, 650, airGain));
      airGain.connect(ctx.destination);
      air.start(0);

      // Dry chirps through a lowpass (far away), plus a single feedback echo.
      const far = lowpass(ctx, 1300);
      const echo = ctx.createDelay(1);
      echo.delayTime.value = 0.23;
      const feedback = ctx.createGain();
      feedback.gain.value = 0.32;
      const wet = ctx.createGain();
      wet.gain.value = 0.45;
      far.connect(echo);
      echo.connect(feedback);
      feedback.connect(echo);
      echo.connect(wet);
      wet.connect(ctx.destination);

      const scale = [note('C5'), note('D5'), note('E5'), note('G5'), note('A5'), note('C6')];
      for (let at = 0.6 + rng() * 0.8; at < AMBIENCE_SECONDS - 0.5; at += 1.1 + rng() * 1.9) {
        const run = rng() < 0.35 ? 3 : 1;
        for (let i = 0; i < run; i += 1) {
          const freq = scale[Math.floor(rng() * scale.length)] ?? note('C5');
          tone(ctx, { type: 'square', freq, start: at + i * 0.075, attack: 0.004, decay: 0.09, gain: 0.018, destination: far });
        }
      }
    },
  },
};

export function renderRecipe(recipe: Recipe, variant: number, defaultSampleRate: number): Promise<AudioBuffer> {
  const sampleRate = recipe.sampleRate ?? defaultSampleRate;
  const ctx = new OfflineAudioContext(1, Math.ceil(recipe.duration * sampleRate), sampleRate);
  recipe.build(ctx, variant, seededRng(0x5eed + variant * 7919));
  return ctx.startRendering();
}
