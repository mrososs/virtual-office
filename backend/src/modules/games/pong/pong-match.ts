import { PONG_RULES, type PongDirection, type PongState } from '@virtual-office/shared';

import { createPongWorld, stepPong, type PongSide, type PongWorld, type RandomSource } from './pong.engine';

export interface PongMatchEvents {
  /** Every tick while running: the snapshot to send to both players. */
  onState(state: PongState): void;
  onPoint(score: [number, number], scorer: PongSide): void;
  onFinished(winner: PongSide, score: [number, number]): void;
}

const STEP_MS = 1000 / PONG_RULES.tickRate;
/** After a stalled event loop, catch up at most this many steps instead of fast-forwarding the ball. */
const MAX_STEPS_PER_WAKE = 4;

/**
 * One running Pong match: the loop around the pure engine. Physics advances
 * in fixed steps from an accumulator of real elapsed time, so the game runs
 * at the same speed whatever the timer jitter (Windows rounds a 33 ms
 * interval up to ~47 ms); one snapshot goes out per wake-up. The loop exists
 * only while the ball is in play — pausing, finishing or stopping clears the
 * interval, so an idle or finished match costs nothing.
 */
export class PongMatch {
  private world: PongWorld;
  private timer: NodeJS.Timeout | null = null;
  private tick = 0;
  private points: [number, number] = [0, 0];
  private lastWakeAt = 0;
  private pendingMs = 0;

  constructor(
    private readonly sessionId: string,
    private readonly events: PongMatchEvents,
    private readonly random: RandomSource = Math.random,
  ) {
    this.world = createPongWorld(this.randomSide());
  }

  get score(): [number, number] {
    return [this.points[0], this.points[1]];
  }

  get running(): boolean {
    return this.timer !== null;
  }

  start(): void {
    if (this.timer) return;
    this.lastWakeAt = Date.now();
    this.pendingMs = 0;
    this.timer = setInterval(() => this.wake(), STEP_MS);
  }

  /** Freezes the table (a player dropped). Paddles stop; `start()` resumes from the same state. */
  pause(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    this.world.directions = [0, 0];
  }

  stop(): void {
    this.pause();
  }

  /** A fresh game for a rematch. */
  reset(): void {
    this.pause();
    this.points = [0, 0];
    this.tick = 0;
    this.world = createPongWorld(this.randomSide());
  }

  setDirection(side: PongSide, direction: PongDirection): void {
    this.world.directions[side] = direction;
  }

  snapshot(): PongState {
    const { ball, paddles, directions } = this.world;
    return {
      sessionId: this.sessionId,
      tick: this.tick,
      ball: { x: Math.round(ball.x), y: Math.round(ball.y), vx: Math.round(ball.vx), vy: Math.round(ball.vy) },
      paddles: [Math.round(paddles[0]), Math.round(paddles[1])],
      directions: [directions[0], directions[1]],
    };
  }

  private wake(): void {
    const now = Date.now();
    this.pendingMs = Math.min(this.pendingMs + (now - this.lastWakeAt), STEP_MS * MAX_STEPS_PER_WAKE);
    this.lastWakeAt = now;
    while (this.pendingMs >= STEP_MS) {
      this.pendingMs -= STEP_MS;
      if (!this.step()) return;
    }
    this.events.onState(this.snapshot());
  }

  /** One physics step. Returns false when the match just finished. */
  private step(): boolean {
    this.tick += 1;
    for (const event of stepPong(this.world, this.random)) {
      if (event.kind !== 'POINT') continue;
      this.points[event.scorer] += 1;
      if (this.points[event.scorer] >= PONG_RULES.targetScore) {
        this.stop();
        this.events.onState(this.snapshot());
        this.events.onFinished(event.scorer, this.score);
        return false;
      }
      this.events.onPoint(this.score, event.scorer);
    }
    return true;
  }

  private randomSide(): PongSide {
    return this.random() < 0.5 ? 0 : 1;
  }
}
