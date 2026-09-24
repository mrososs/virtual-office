import type { UUID, Vector2 } from '@virtual-office/shared';
import type Phaser from 'phaser';

import type { EmployeeAvatar } from '@/game/entities/EmployeeAvatar';
import type { NavigationTarget } from '@/game/navigation/NavigationTarget';
import type { PathFinder } from '@/game/navigation/PathFinder';

import { AUTO_SPEED, type MovementSystem } from './MovementSystem';

export type NavigationOutcome = 'arrived' | 'cancelled' | 'unreachable';

interface NavigationCallbacks {
  onComplete?: (outcome: NavigationOutcome) => void;
}

interface NavigationJob extends NavigationCallbacks {
  avatar: EmployeeAvatar;
  target: NavigationTarget;
  waypoints: Vector2[];
  index: number;
  speed: number;
  lastRemaining: number;
  stalledMs: number;
}

const ARRIVAL_RADIUS = 2;
const LOCAL_STALL_LIMIT_MS = 1600;

/**
 * Drives PlayerControlMode === 'AUTO_NAVIGATION' movement (e.g. walking an
 * avatar to a meeting room automatically).
 *
 * IMPORTANT: AUTO_NAVIGATION must NEVER override a player currently in
 * MANUAL control mode. If a request arrives while the player is MANUAL, it
 * is queued and only applied once the player releases control — never force
 * a mode switch out from under the human. Any manual input during an auto
 * move cancels it (see PlayerManager).
 */
export class AutoMovementSystem {
  private readonly jobs = new Map<UUID, NavigationJob>();
  private readonly queued = new Map<UUID, { avatar: EmployeeAvatar; target: NavigationTarget; callbacks: NavigationCallbacks }>();

  constructor(
    protected readonly scene: Phaser.Scene,
    private readonly pathFinder: PathFinder,
    private readonly movement: MovementSystem,
  ) {}

  navigate(avatar: EmployeeAvatar, target: NavigationTarget, callbacks: NavigationCallbacks = {}): void {
    this.cancel(avatar.employeeId, 'cancelled');
    if (avatar.body.controlMode === 'MANUAL') {
      this.queued.set(avatar.employeeId, { avatar, target, callbacks });
      return;
    }
    this.begin(avatar, target, callbacks);
  }

  cancel(employeeId: UUID, outcome: NavigationOutcome = 'cancelled'): void {
    this.queued.delete(employeeId);
    const job = this.jobs.get(employeeId);
    if (!job) return;
    this.jobs.delete(employeeId);
    this.movement.stop(job.avatar);
    job.avatar.body.setControlMode('STATIC');
    job.onComplete?.(outcome);
  }

  isNavigating(employeeId: UUID): boolean {
    return this.jobs.has(employeeId) || this.queued.has(employeeId);
  }

  update(deltaMs: number): void {
    for (const [employeeId, pending] of this.queued) {
      if (pending.avatar.body.controlMode !== 'MANUAL') {
        this.queued.delete(employeeId);
        this.begin(pending.avatar, pending.target, pending.callbacks);
      }
    }

    for (const job of [...this.jobs.values()]) {
      const waypoint = job.waypoints[job.index];
      if (!waypoint) {
        this.finish(job, 'arrived');
        continue;
      }

      if (job.avatar.isLocal) {
        const remaining = this.movement.steerTowards(job.avatar, waypoint, job.speed);
        job.stalledMs = remaining > job.lastRemaining - 0.2 ? job.stalledMs + deltaMs : 0;
        job.lastRemaining = remaining;
        if (remaining <= ARRIVAL_RADIUS + 3) this.advance(job);
        else if (job.stalledMs > LOCAL_STALL_LIMIT_MS) this.finish(job, 'unreachable');
      } else {
        const remaining = this.movement.stepTowards(job.avatar, waypoint, job.speed, deltaMs);
        if (remaining <= ARRIVAL_RADIUS) this.advance(job);
      }
    }
  }

  private begin(avatar: EmployeeAvatar, target: NavigationTarget, callbacks: NavigationCallbacks): void {
    const waypoints = this.pathFinder.findPath(avatar.position, target.position);
    if (!waypoints) {
      if (avatar.isLocal) {
        callbacks.onComplete?.('unreachable');
        return;
      }
      // Scripted avatars must never get stuck: fall back to a teleport.
      avatar.body.setPosition(target.position.x, target.position.y);
      if (target.facing) avatar.body.face(target.facing);
      callbacks.onComplete?.('arrived');
      return;
    }
    avatar.body.setControlMode('AUTO_NAVIGATION');
    this.jobs.set(avatar.employeeId, {
      avatar,
      target,
      waypoints,
      index: 0,
      speed: avatar.isLocal ? AUTO_SPEED * 1.45 : AUTO_SPEED,
      lastRemaining: Number.POSITIVE_INFINITY,
      stalledMs: 0,
      ...callbacks,
    });
  }

  private advance(job: NavigationJob): void {
    job.index += 1;
    job.lastRemaining = Number.POSITIVE_INFINITY;
    job.stalledMs = 0;
    if (job.index >= job.waypoints.length) this.finish(job, 'arrived');
  }

  private finish(job: NavigationJob, outcome: NavigationOutcome): void {
    this.jobs.delete(job.avatar.employeeId);
    this.movement.stop(job.avatar);
    if (outcome === 'arrived' && job.target.facing) job.avatar.body.face(job.target.facing);
    job.avatar.body.setControlMode('STATIC');
    job.onComplete?.(outcome);
  }
}
