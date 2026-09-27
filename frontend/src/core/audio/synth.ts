/**
 * Tiny synthesis toolkit for the sound bank. Every sound in the app is built
 * from these parts in an OfflineAudioContext once (after the first user
 * gesture) and then replayed from memory — no audio files are downloaded,
 * and there are no third-party assets or licenses involved.
 */
export type Rng = () => number;

/** Deterministic PRNG (mulberry32): a sound renders identically every time. */
export function seededRng(seed: number): Rng {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const SILENT = 0.0001;

/** A gain node shaped as a fast attack and exponential decay, starting at `start`. */
export function envelope(ctx: BaseAudioContext, start: number, attack: number, decay: number, peak: number, destination: AudioNode): GainNode {
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(SILENT, start);
  gain.gain.exponentialRampToValueAtTime(Math.max(SILENT, peak), start + attack);
  gain.gain.exponentialRampToValueAtTime(SILENT, start + attack + decay);
  gain.connect(destination);
  return gain;
}

export interface ToneOptions {
  type?: OscillatorType;
  freq: number;
  /** Glide target reached at the end of the decay. */
  to?: number;
  start?: number;
  attack?: number;
  decay: number;
  gain: number;
  destination?: AudioNode;
}

export function tone(ctx: BaseAudioContext, options: ToneOptions): void {
  const start = options.start ?? 0;
  const attack = options.attack ?? 0.004;
  const oscillator = ctx.createOscillator();
  oscillator.type = options.type ?? 'sine';
  oscillator.frequency.setValueAtTime(options.freq, start);
  if (options.to) oscillator.frequency.exponentialRampToValueAtTime(options.to, start + attack + options.decay);
  oscillator.connect(envelope(ctx, start, attack, options.decay, options.gain, options.destination ?? ctx.destination));
  oscillator.start(start);
  oscillator.stop(start + attack + options.decay + 0.02);
}

/** A soft bell: fundamental plus quickly fading upper partials. */
export function bell(ctx: BaseAudioContext, options: { freq: number; start?: number; decay: number; gain: number; destination?: AudioNode }): void {
  const { freq, decay, gain } = options;
  const start = options.start ?? 0;
  const destination = options.destination ?? ctx.destination;
  tone(ctx, { freq, start, attack: 0.005, decay, gain, destination });
  tone(ctx, { freq: freq * 2, start, attack: 0.003, decay: decay * 0.45, gain: gain * 0.22, destination });
  tone(ctx, { freq: freq * 3.01, start, attack: 0.002, decay: decay * 0.25, gain: gain * 0.08, destination });
}

export function noiseBuffer(ctx: BaseAudioContext, seconds: number, rng: Rng): AudioBuffer {
  const length = Math.max(1, Math.ceil(seconds * ctx.sampleRate));
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i += 1) data[i] = rng() * 2 - 1;
  return buffer;
}

export interface NoiseHitOptions {
  start?: number;
  attack?: number;
  decay: number;
  gain: number;
  filter: BiquadFilterType;
  freq: number;
  q?: number;
  rng: Rng;
  destination?: AudioNode;
}

/** A filtered noise burst (footfalls, scuffs, air). */
export function noiseHit(ctx: BaseAudioContext, options: NoiseHitOptions): void {
  const start = options.start ?? 0;
  const attack = options.attack ?? 0.003;
  const source = ctx.createBufferSource();
  source.buffer = noiseBuffer(ctx, attack + options.decay + 0.02, options.rng);
  const filter = ctx.createBiquadFilter();
  filter.type = options.filter;
  filter.frequency.value = options.freq;
  filter.Q.value = options.q ?? 0.8;
  source.connect(filter);
  filter.connect(envelope(ctx, start, attack, options.decay, options.gain, options.destination ?? ctx.destination));
  source.start(start);
}

export function lowpass(ctx: BaseAudioContext, freq: number, destination: AudioNode = ctx.destination): BiquadFilterNode {
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = freq;
  filter.Q.value = 0.5;
  filter.connect(destination);
  return filter;
}

/**
 * Makes a rendered buffer loop seamlessly: the extra `crossfadeSeconds` at
 * its end are blended into its start, and the result is that much shorter.
 */
export function toSeamlessLoop(ctx: BaseAudioContext, rendered: AudioBuffer, crossfadeSeconds: number): AudioBuffer {
  const fade = Math.floor(crossfadeSeconds * rendered.sampleRate);
  const length = rendered.length - fade;
  const loop = ctx.createBuffer(1, length, rendered.sampleRate);
  const source = rendered.getChannelData(0);
  const target = loop.getChannelData(0);
  target.set(source.subarray(0, length));
  for (let i = 0; i < fade; i += 1) {
    const mix = i / fade;
    target[i] = (source[i] ?? 0) * mix + (source[length + i] ?? 0) * (1 - mix);
  }
  return loop;
}
