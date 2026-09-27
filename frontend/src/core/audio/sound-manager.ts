import { LOOP_LIBRARY, renderRecipe, SOUND_LIBRARY, type LoopId, type SoundCategory, type SoundId } from './sound-library';
import { toSeamlessLoop } from './synth';

/** Volumes are 0–100. `enabled` is the master On/Off switch. */
export interface SoundPreferences {
  enabled: boolean;
  master: number;
  environment: number;
  movement: number;
  ui: number;
  notifications: number;
  games: number;
}

export const DEFAULT_SOUND_PREFERENCES: Readonly<SoundPreferences> = {
  enabled: true,
  master: 60,
  environment: 35,
  movement: 20,
  ui: 45,
  notifications: 55,
  games: 50,
};

export interface PlayOptions {
  /** Playback-rate multiplier (pitch + speed). */
  rate?: number;
  /** Extra gain for this one play, 0–1. */
  gain?: number;
}

const STORAGE_KEY = 'vo:sound-preferences:v1';
const CATEGORIES: readonly SoundCategory[] = ['environment', 'movement', 'ui', 'notifications', 'games'];
const UNLOCK_EVENTS = ['pointerdown', 'keydown', 'touchend'] as const;
const LOOP_FADE_IN_S = 1.2;
const LOOP_FADE_OUT_S = 0.6;

type WindowWithWebkitAudio = Window & { webkitAudioContext?: typeof AudioContext };

interface RunningLoop {
  source: AudioBufferSourceNode;
  gain: GainNode;
}

/**
 * The one audio engine for the whole app (Phaser, Vue UI, notifications,
 * games). Nobody else creates an AudioContext or plays audio.
 *
 * - Nothing happens before the first user gesture: the AudioContext is
 *   created on the first pointer/key press (browsers' autoplay policy), and
 *   plays requested before that are dropped rather than queued.
 * - Sounds are synthesized once into memory (see sound-library) — no files.
 * - Preferences live in localStorage (per browser), with a mixer bus per
 *   category under a master bus. Sound Off means nothing is even scheduled.
 * - Hidden tabs stop ambience loops, but short cues still play — e.g. "your
 *   opponent joined" while you wait in the game's own tab.
 */
class SoundManager {
  private context: AudioContext | null = null;
  private masterBus: GainNode | null = null;
  private readonly buses = new Map<SoundCategory, GainNode>();
  private readonly buffers = new Map<SoundId | LoopId, AudioBuffer[]>();
  private readonly lastPlayedAt = new Map<SoundId, number>();
  private readonly wantedLoops = new Set<LoopId>();
  private readonly runningLoops = new Map<LoopId, RunningLoop>();
  private readonly listeners = new Set<(preferences: SoundPreferences) => void>();
  private preferences: SoundPreferences = loadPreferences();
  private bankReady = false;
  private installed = false;
  /** Development counters for runtime checks (window.__VO_AUDIO__). */
  private readonly stats = { played: {} as Record<string, number>, dropped: 0 };

  /** Listens for the first (and every later) user gesture. Call once at startup. */
  install(): void {
    if (this.installed || typeof window === 'undefined') return;
    this.installed = true;
    for (const event of UNLOCK_EVENTS) window.addEventListener(event, this.onGesture, { capture: true, passive: true });
    document.addEventListener('visibilitychange', this.onVisibility);
    if (import.meta.env.DEV) {
      (window as Window & { __VO_AUDIO__?: unknown }).__VO_AUDIO__ = { stats: () => this.debugStats() };
    }
  }

  getPreferences(): SoundPreferences {
    return { ...this.preferences };
  }

  updatePreferences(patch: Partial<SoundPreferences>): void {
    this.preferences = sanitize({ ...this.preferences, ...patch });
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(this.preferences));
    } catch {
      // Private mode / storage full: the change still applies to this tab.
    }
    // Turning sound on happens in a click handler, which is a valid gesture to start audio.
    if (this.preferences.enabled) this.unlock();
    this.applyVolumes();
    this.reconcileLoops();
    for (const listener of this.listeners) listener(this.getPreferences());
  }

  resetPreferences(): void {
    this.updatePreferences({ ...DEFAULT_SOUND_PREFERENCES });
  }

  subscribe(listener: (preferences: SoundPreferences) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /** Plays a one-shot. Returns false when it was not played (sound off, not unlocked yet, muted category, throttled). */
  play(id: SoundId, options: PlayOptions = {}): boolean {
    const definition = SOUND_LIBRARY[id];
    const context = this.context;
    const takes = this.buffers.get(id);
    if (!context || context.state !== 'running' || !takes?.length || !this.audible(definition.category)) {
      this.stats.dropped += 1;
      return false;
    }
    const now = performance.now();
    if (definition.minIntervalMs && now - (this.lastPlayedAt.get(id) ?? Number.NEGATIVE_INFINITY) < definition.minIntervalMs) return false;
    this.lastPlayedAt.set(id, now);

    const source = context.createBufferSource();
    source.buffer = takes[Math.floor(Math.random() * takes.length)] ?? takes[0] ?? null;
    const jitter = definition.rateJitter ? (Math.random() * 2 - 1) * definition.rateJitter : 0;
    source.playbackRate.value = (options.rate ?? 1) * (1 + jitter);
    const bus = this.buses.get(definition.category);
    if (!bus) return false;
    if (options.gain !== undefined && options.gain < 1) {
      const gain = context.createGain();
      gain.gain.value = Math.max(0, options.gain);
      source.connect(gain);
      gain.connect(bus);
      source.onended = () => gain.disconnect();
    } else {
      source.connect(bus);
    }
    source.start();
    this.stats.played[id] = (this.stats.played[id] ?? 0) + 1;
    return true;
  }

  /** Declares whether a loop should be playing; it actually runs only while audible. */
  setLoop(id: LoopId, on: boolean): void {
    if (on) this.wantedLoops.add(id);
    else this.wantedLoops.delete(id);
    this.reconcileLoops();
  }

  /* Internals ---------------------------------------------------------------- */

  private onGesture = (): void => this.unlock();

  private onVisibility = (): void => {
    const context = this.context;
    if (context && !document.hidden && this.preferences.enabled && context.state !== 'running') void context.resume().catch(() => undefined);
    this.reconcileLoops();
  };

  private unlock(): void {
    if (!this.preferences.enabled) return;
    if (!this.context) {
      const Context = window.AudioContext ?? (window as WindowWithWebkitAudio).webkitAudioContext;
      if (!Context) return;
      try {
        this.context = new Context({ latencyHint: 'interactive' });
      } catch {
        return;
      }
      this.buildGraph(this.context);
      void this.loadBank(this.context);
    }
    if (this.context.state !== 'running') {
      void this.context.resume().then(
        () => this.reconcileLoops(),
        () => undefined,
      );
    }
  }

  private buildGraph(context: AudioContext): void {
    const master = context.createGain();
    master.connect(context.destination);
    this.masterBus = master;
    for (const category of CATEGORIES) {
      const bus = context.createGain();
      bus.connect(master);
      this.buses.set(category, bus);
    }
    this.applyVolumes(true);
  }

  private async loadBank(context: AudioContext): Promise<void> {
    const jobs: Array<Promise<void>> = [];
    for (const [id, definition] of Object.entries(SOUND_LIBRARY) as Array<[SoundId, (typeof SOUND_LIBRARY)[SoundId]]>) {
      const takes = Array.from({ length: definition.variants ?? 1 }, (_, variant) => renderRecipe(definition, variant, context.sampleRate));
      jobs.push(Promise.all(takes).then((buffers) => void this.buffers.set(id, buffers)));
    }
    for (const [id, definition] of Object.entries(LOOP_LIBRARY) as Array<[LoopId, (typeof LOOP_LIBRARY)[LoopId]]>) {
      jobs.push(renderRecipe(definition, 0, context.sampleRate).then((buffer) => void this.buffers.set(id, [toSeamlessLoop(context, buffer, definition.loopCrossfade)])));
    }
    try {
      await Promise.all(jobs);
      this.bankReady = true;
      this.reconcileLoops();
    } catch (error) {
      // Rendering is best effort: without it the app is simply silent.
      console.warn('[audio] could not prepare sounds', error);
    }
  }

  private audible(category: SoundCategory): boolean {
    return this.preferences.enabled && this.preferences.master > 0 && this.preferences[category] > 0;
  }

  private applyVolumes(immediate = false): void {
    const context = this.context;
    if (!context || !this.masterBus) return;
    const set = (param: AudioParam, value: number) => {
      if (immediate) param.value = value;
      else param.setTargetAtTime(value, context.currentTime, 0.05);
    };
    set(this.masterBus.gain, this.preferences.enabled ? this.preferences.master / 100 : 0);
    for (const category of CATEGORIES) {
      const bus = this.buses.get(category);
      if (bus) set(bus.gain, this.preferences[category] / 100);
    }
  }

  private reconcileLoops(): void {
    const context = this.context;
    for (const id of Object.keys(LOOP_LIBRARY) as LoopId[]) {
      const running = this.runningLoops.get(id);
      const shouldRun = !!context && context.state === 'running' && !document.hidden && this.bankReady && this.wantedLoops.has(id) && this.audible(LOOP_LIBRARY[id].category);
      if (shouldRun && !running && context) this.startLoop(context, id);
      else if (!shouldRun && running) this.stopLoop(id, running);
    }
  }

  private startLoop(context: AudioContext, id: LoopId): void {
    const buffer = this.buffers.get(id)?.[0];
    const bus = this.buses.get(LOOP_LIBRARY[id].category);
    if (!buffer || !bus) return;
    const source = context.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    const gain = context.createGain();
    gain.gain.setValueAtTime(0.0001, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(1, context.currentTime + LOOP_FADE_IN_S);
    source.connect(gain);
    gain.connect(bus);
    // Start somewhere in the loop so re-entering the room doesn't always begin the same way.
    source.start(0, Math.random() * buffer.duration);
    this.runningLoops.set(id, { source, gain });
    this.stats.played[id] = (this.stats.played[id] ?? 0) + 1;
  }

  private stopLoop(id: LoopId, loop: RunningLoop): void {
    this.runningLoops.delete(id);
    const context = this.context;
    if (!context) return;
    const end = context.currentTime + LOOP_FADE_OUT_S;
    loop.gain.gain.cancelScheduledValues(context.currentTime);
    loop.gain.gain.setValueAtTime(Math.max(0.0001, loop.gain.gain.value), context.currentTime);
    loop.gain.gain.exponentialRampToValueAtTime(0.0001, end);
    loop.source.stop(end + 0.05);
    loop.source.onended = () => loop.gain.disconnect();
  }

  private debugStats() {
    return {
      state: this.context?.state ?? 'not-created',
      bankReady: this.bankReady,
      sounds: this.buffers.size,
      played: { ...this.stats.played },
      dropped: this.stats.dropped,
      loops: [...this.runningLoops.keys()],
      wantedLoops: [...this.wantedLoops],
      preferences: this.getPreferences(),
    };
  }
}

function clampVolume(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? Math.round(Math.min(100, Math.max(0, value))) : fallback;
}

function sanitize(value: Partial<SoundPreferences>): SoundPreferences {
  const defaults = DEFAULT_SOUND_PREFERENCES;
  return {
    enabled: typeof value.enabled === 'boolean' ? value.enabled : defaults.enabled,
    master: clampVolume(value.master, defaults.master),
    environment: clampVolume(value.environment, defaults.environment),
    movement: clampVolume(value.movement, defaults.movement),
    ui: clampVolume(value.ui, defaults.ui),
    notifications: clampVolume(value.notifications, defaults.notifications),
    games: clampVolume(value.games, defaults.games),
  };
}

function loadPreferences(): SoundPreferences {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return sanitize(raw ? (JSON.parse(raw) as Partial<SoundPreferences>) : {});
  } catch {
    return { ...DEFAULT_SOUND_PREFERENCES };
  }
}

export const soundManager = new SoundManager();
