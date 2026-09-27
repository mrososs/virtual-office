/**
 * Pong rules and geometry, shared so the client predicts its own paddle with
 * the exact numbers the server simulates. Units: logical px and px/s on a
 * fixed field; clients scale the field to fit the screen.
 */
export const PONG_RULES = {
  fieldWidth: 800,
  fieldHeight: 480,
  paddleWidth: 12,
  paddleHeight: 84,
  /** Gap between the side wall and the paddle's outer edge. */
  paddleInset: 28,
  paddleSpeed: 440,
  ballRadius: 7,
  ballStartSpeed: 340,
  /** Speed multiplier on every paddle hit, up to `ballMaxSpeed`. */
  ballSpeedUp: 1.06,
  ballMaxSpeed: 760,
  /** Hitting the paddle's tip sends the ball off at this angle; the center returns it straight. */
  maxBounceAngleDeg: 55,
  targetScore: 5,
  /** Authoritative simulation and broadcast rate (Hz). */
  tickRate: 30,
  countdownMs: 3000,
  /** The ball rests at the center this long after each point. */
  serveDelayMs: 900,
  /** A playing client repeats its input at least this often, so the server notices a dead connection quickly. */
  inputHeartbeatMs: 2000,
} as const;

/** X of each paddle's center, [left, right]. */
export function pongPaddleCenterX(side: 0 | 1): number {
  const { fieldWidth, paddleInset, paddleWidth } = PONG_RULES;
  return side === 0 ? paddleInset + paddleWidth / 2 : fieldWidth - paddleInset - paddleWidth / 2;
}

export function clampPongPaddle(y: number): number {
  const half = PONG_RULES.paddleHeight / 2;
  return Math.min(PONG_RULES.fieldHeight - half, Math.max(half, y));
}
