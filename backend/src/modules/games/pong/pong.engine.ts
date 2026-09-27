import { clampPongPaddle, PONG_RULES, type PongDirection } from '@virtual-office/shared';

export type PongSide = 0 | 1;

/** The whole simulated table. Mutated in place by `stepPong`, one fixed tick at a time. */
export interface PongWorld {
  ball: { x: number; y: number; vx: number; vy: number };
  /** Paddle centers (y), [left, right]. */
  paddles: [number, number];
  directions: [PongDirection, PongDirection];
  /** Ticks the ball still rests at the center before it is served. */
  serveInTicks: number;
  /** The side the next serve travels toward. */
  serveTowards: PongSide;
}

export type PongStepEvent = { kind: 'PADDLE_HIT'; side: PongSide } | { kind: 'WALL' } | { kind: 'POINT'; scorer: PongSide };

export type RandomSource = () => number;

const DT = 1 / PONG_RULES.tickRate;
const SERVE_DELAY_TICKS = Math.round((PONG_RULES.serveDelayMs / 1000) * PONG_RULES.tickRate);
const MAX_SERVE_ANGLE = (25 * Math.PI) / 180;
const MAX_BOUNCE_ANGLE = (PONG_RULES.maxBounceAngleDeg * Math.PI) / 180;
const LEFT_FACE = PONG_RULES.paddleInset + PONG_RULES.paddleWidth;
const RIGHT_FACE = PONG_RULES.fieldWidth - PONG_RULES.paddleInset - PONG_RULES.paddleWidth;

export function createPongWorld(serveTowards: PongSide): PongWorld {
  const middle = PONG_RULES.fieldHeight / 2;
  const world: PongWorld = {
    ball: { x: 0, y: 0, vx: 0, vy: 0 },
    paddles: [middle, middle],
    directions: [0, 0],
    serveInTicks: 0,
    serveTowards,
  };
  restForServe(world, serveTowards);
  return world;
}

/**
 * Advances one tick. Collisions are swept (the ball's path is tested
 * against each paddle face), so a fast ball cannot tunnel through a paddle
 * at 30 Hz. Returns what happened, for scoring.
 */
export function stepPong(world: PongWorld, random: RandomSource = Math.random): PongStepEvent[] {
  const events: PongStepEvent[] = [];
  for (const side of [0, 1] as const) {
    world.paddles[side] = clampPongPaddle(world.paddles[side] + world.directions[side] * PONG_RULES.paddleSpeed * DT);
  }

  if (world.serveInTicks > 0) {
    world.serveInTicks -= 1;
    if (world.serveInTicks === 0) serve(world, random);
    return events;
  }

  const { ball } = world;
  const r = PONG_RULES.ballRadius;
  const height = PONG_RULES.fieldHeight;
  const previous = { x: ball.x, y: ball.y };
  ball.x += ball.vx * DT;
  ball.y += ball.vy * DT;

  if (ball.y - r < 0) {
    ball.y = 2 * r - ball.y;
    ball.vy = Math.abs(ball.vy);
    events.push({ kind: 'WALL' });
  } else if (ball.y + r > height) {
    ball.y = 2 * (height - r) - ball.y;
    ball.vy = -Math.abs(ball.vy);
    events.push({ kind: 'WALL' });
  }

  if (ball.vx < 0 && previous.x - r >= LEFT_FACE && ball.x - r < LEFT_FACE) {
    const t = (previous.x - r - LEFT_FACE) / (previous.x - ball.x);
    if (tryBounce(world, 0, previous.y + (ball.y - previous.y) * t, LEFT_FACE + r)) events.push({ kind: 'PADDLE_HIT', side: 0 });
  } else if (ball.vx > 0 && previous.x + r <= RIGHT_FACE && ball.x + r > RIGHT_FACE) {
    const t = (RIGHT_FACE - (previous.x + r)) / (ball.x - previous.x);
    if (tryBounce(world, 1, previous.y + (ball.y - previous.y) * t, RIGHT_FACE - r)) events.push({ kind: 'PADDLE_HIT', side: 1 });
  }

  if (ball.x + r < 0) {
    events.push({ kind: 'POINT', scorer: 1 });
    restForServe(world, 0);
  } else if (ball.x - r > PONG_RULES.fieldWidth) {
    events.push({ kind: 'POINT', scorer: 0 });
    restForServe(world, 1);
  }
  return events;
}

/** Puts the ball back at the center; it is served toward `towards` (the side that conceded) after a pause. */
export function restForServe(world: PongWorld, towards: PongSide): void {
  world.ball = { x: PONG_RULES.fieldWidth / 2, y: PONG_RULES.fieldHeight / 2, vx: 0, vy: 0 };
  world.serveTowards = towards;
  world.serveInTicks = SERVE_DELAY_TICKS;
}

function serve(world: PongWorld, random: RandomSource): void {
  const angle = (random() * 2 - 1) * MAX_SERVE_ANGLE;
  const direction = world.serveTowards === 0 ? -1 : 1;
  world.ball.vx = direction * PONG_RULES.ballStartSpeed * Math.cos(angle);
  world.ball.vy = PONG_RULES.ballStartSpeed * Math.sin(angle);
}

/** Where along the paddle the ball lands decides the return angle; every hit speeds it up a little. */
function tryBounce(world: PongWorld, side: PongSide, yAtFace: number, x: number): boolean {
  const reach = PONG_RULES.paddleHeight / 2 + PONG_RULES.ballRadius;
  const offset = (yAtFace - world.paddles[side]) / reach;
  if (Math.abs(offset) > 1) return false;
  const { ball } = world;
  const speed = Math.min(PONG_RULES.ballMaxSpeed, Math.hypot(ball.vx, ball.vy) * PONG_RULES.ballSpeedUp);
  const angle = offset * MAX_BOUNCE_ANGLE;
  ball.vx = (side === 0 ? 1 : -1) * speed * Math.cos(angle);
  ball.vy = speed * Math.sin(angle);
  ball.x = x;
  ball.y = yAtFace;
  return true;
}
