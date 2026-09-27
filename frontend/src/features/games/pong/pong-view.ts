import { clampPongPaddle, PONG_RULES, pongPaddleCenterX, type PongDirection, type PongState } from '@virtual-office/shared';

import { soundManager } from '@/core/audio';

const { fieldWidth: W, fieldHeight: H, ballRadius: R, paddleWidth, paddleHeight, paddleSpeed } = PONG_RULES;
/** Never extrapolate further than this past the last snapshot (a stalled connection shouldn't fling the ball). */
const MAX_EXTRAPOLATION_S = 0.15;
/** Own paddle further than this from the server's is snapped (e.g. after a pause). */
const SNAP_DISTANCE = 90;

const COLORS = {
  field: '#0f131b',
  line: 'rgba(255, 255, 255, 0.07)',
  border: 'rgba(255, 255, 255, 0.08)',
  me: '#7c83ff',
  opponent: '#e6e8ee',
  ball: '#ffffff',
};

/**
 * Client side of a Pong match: draws the server's latest snapshot, smoothed.
 *   - own paddle: predicted locally from your input (same speed as the server), eased onto the server's when idle
 *   - opponent paddle: last position + its direction × time since the snapshot, eased
 *   - ball: last position + velocity × time since the snapshot, reflected off the walls
 * Paddle hits and wall bounces are inferred from velocity sign flips between
 * snapshots, so sounds need no extra network events.
 */
export class PongView {
  private latest: PongState | null = null;
  private receivedAt = 0;
  private myY = H / 2;
  private opponentY = H / 2;
  private direction: PongDirection = 0;
  private playing = false;

  constructor(private readonly mySide: 0 | 1) {}

  setDirection(direction: PongDirection): void {
    this.direction = direction;
  }

  setPlaying(playing: boolean): void {
    this.playing = playing;
  }

  /** A new game (match found / rematch): forget the previous table. */
  reset(): void {
    this.latest = null;
    this.myY = H / 2;
    this.opponentY = H / 2;
  }

  receive(state: PongState, now: number): void {
    const previous = this.latest;
    this.latest = state;
    this.receivedAt = now;
    if (!previous || previous.sessionId !== state.sessionId) return;
    const before = previous.ball;
    const after = state.ball;
    if (before.vx !== 0 && after.vx !== 0 && Math.sign(before.vx) !== Math.sign(after.vx)) {
      const speed = Math.hypot(after.vx, after.vy);
      soundManager.play('pong-hit', { rate: 0.94 + Math.min(0.2, (speed - PONG_RULES.ballStartSpeed) / 2000) });
    } else if (before.vy !== 0 && after.vy !== 0 && Math.sign(before.vy) !== Math.sign(after.vy)) {
      soundManager.play('pong-wall');
    }
  }

  draw(ctx: CanvasRenderingContext2D, scale: number, now: number, dt: number): void {
    const opponentSide = this.mySide === 0 ? 1 : 0;
    const latest = this.latest;
    const age = this.playing && latest ? Math.min(MAX_EXTRAPOLATION_S, (now - this.receivedAt) / 1000) : 0;

    if (this.playing) this.myY = clampPongPaddle(this.myY + this.direction * paddleSpeed * dt);
    if (latest) {
      const server = latest.paddles[this.mySide];
      const error = server - this.myY;
      if (Math.abs(error) > SNAP_DISTANCE || !this.playing) this.myY = server;
      else if (this.direction === 0) this.myY += error * Math.min(1, dt * 10);
      const target = clampPongPaddle(latest.paddles[opponentSide] + latest.directions[opponentSide] * paddleSpeed * age);
      this.opponentY += (target - this.opponentY) * Math.min(1, dt * 20);
    }

    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    ctx.fillStyle = COLORS.field;
    ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = COLORS.border;
    ctx.lineWidth = 2;
    ctx.strokeRect(1, 1, W - 2, H - 2);
    ctx.setLineDash([10, 14]);
    ctx.strokeStyle = COLORS.line;
    ctx.beginPath();
    ctx.moveTo(W / 2, 12);
    ctx.lineTo(W / 2, H - 12);
    ctx.stroke();
    ctx.setLineDash([]);

    this.drawPaddle(ctx, this.mySide, this.myY, COLORS.me);
    this.drawPaddle(ctx, opponentSide, this.opponentY, COLORS.opponent);

    const ball = latest?.ball ?? { x: W / 2, y: H / 2, vx: 0, vy: 0 };
    const x = Math.max(-R * 3, Math.min(W + R * 3, ball.x + ball.vx * age));
    let y = ball.y + ball.vy * age;
    if (y < R) y = 2 * R - y;
    if (y > H - R) y = 2 * (H - R) - y;
    ctx.fillStyle = COLORS.ball;
    ctx.beginPath();
    ctx.arc(x, y, R, 0, Math.PI * 2);
    ctx.fill();
  }

  private drawPaddle(ctx: CanvasRenderingContext2D, side: 0 | 1, y: number, color: string): void {
    ctx.fillStyle = color;
    const x = pongPaddleCenterX(side) - paddleWidth / 2;
    const top = y - paddleHeight / 2;
    const radius = paddleWidth / 2;
    ctx.beginPath();
    ctx.roundRect(x, top, paddleWidth, paddleHeight, radius);
    ctx.fill();
  }
}
