import type { Direction, PlacementTarget, UUID, Vector2 } from '@virtual-office/shared';
import Phaser from 'phaser';

import type { EmployeeStatusView, EmployeeWorldState } from '@/game/bridge/GameEvents';
import { EmployeeAvatar } from '@/game/entities/EmployeeAvatar';
import { RemotePlayer } from '@/game/entities/RemotePlayer';
import type { NavigationTarget } from '@/game/navigation/NavigationTarget';
import type { AutoMovementSystem } from '@/game/systems/AutoMovementSystem';
import type { InteractionSystem } from '@/game/systems/InteractionSystem';
import type { RoomSystem } from '@/game/systems/RoomSystem';

import type { DeskManager } from './DeskManager';
import type { OfficeMapManager } from './OfficeMapManager';
import type { RoomManager } from './RoomManager';

interface EmployeeRuntime {
  avatar: EmployeeAvatar;
  placement: PlacementTarget;
  anchor: NavigationTarget | null;
  settled: boolean;
  wanderAt: number | null;
  awayFromAnchor: boolean;
  /** Incremented on every new placement so stale arrival callbacks are ignored. */
  version: number;
}

export interface EmployeeManagerDeps {
  autoMovement: AutoMovementSystem;
  roomManager: RoomManager;
  deskManager: DeskManager;
  mapManager: OfficeMapManager;
  interaction: InteractionSystem;
  roomSystem: () => RoomSystem;
  onArrived: (employeeId: UUID, placement: PlacementTarget) => void;
}

/**
 * Owns every non-local avatar. Turns domain placements (desk / room /
 * hidden) into concrete seats and walks, and hands avatars over to network
 * control when the real person connects from another browser.
 */
export class EmployeeManager {
  private readonly runtimes = new Map<UUID, EmployeeRuntime>();

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly deps: EmployeeManagerDeps,
  ) {}

  spawnAll(states: EmployeeWorldState[]): void {
    for (const state of states) this.spawn(state);
  }

  spawn(state: EmployeeWorldState): EmployeeAvatar {
    const entrance = this.deps.mapManager.map.entrance;
    const avatar = new EmployeeAvatar(this.scene, {
      status: state.status,
      appearance: state.appearance,
      position: { x: entrance.x, y: entrance.y },
      facing: entrance.facing,
      isLocal: false,
    });
    this.deps.interaction.registerEmployee(avatar);
    const runtime: EmployeeRuntime = { avatar, placement: state.placement, anchor: null, settled: false, wanderAt: null, awayFromAnchor: false, version: 0 };
    this.runtimes.set(avatar.employeeId, runtime);
    this.applyPlacement(avatar.employeeId, state.placement, true);
    return avatar;
  }

  get(employeeId: UUID): EmployeeAvatar | undefined {
    return this.runtimes.get(employeeId)?.avatar;
  }

  avatars(): IterableIterator<EmployeeAvatar> {
    return [...this.runtimes.values()].map((runtime) => runtime.avatar).values();
  }

  applyStatus(view: EmployeeStatusView): void {
    this.runtimes.get(view.employeeId)?.avatar.applyStatus(view);
  }

  applyPlacement(employeeId: UUID, placement: PlacementTarget, instant: boolean): void {
    const runtime = this.runtimes.get(employeeId);
    if (!runtime) return;
    runtime.placement = placement;
    runtime.version += 1;
    runtime.wanderAt = null;
    runtime.awayFromAnchor = false;
    if (runtime.avatar.controller === 'REMOTE') return;

    const { autoMovement, roomManager } = this.deps;
    const avatar = runtime.avatar;
    roomManager.releaseSpot(employeeId);

    if (placement.kind === 'HIDDEN') {
      runtime.anchor = null;
      runtime.settled = false;
      if (avatar.isHidden) return;
      if (instant) {
        autoMovement.cancel(employeeId);
        avatar.setHidden(true, false);
        this.deps.roomSystem().forget(employeeId);
        return;
      }
      this.walkTo(runtime, this.entranceTarget(), () => {
        avatar.setHidden(true, true, () => this.deps.roomSystem().forget(employeeId));
      });
      return;
    }

    const target = this.resolveTarget(employeeId, placement);
    if (!target) return;
    runtime.anchor = target;
    runtime.settled = false;

    if (instant) {
      autoMovement.cancel(employeeId);
      avatar.body.setPosition(target.position.x, target.position.y);
      if (target.facing) avatar.body.face(target.facing);
      if (avatar.isHidden) avatar.setHidden(false, false);
      avatar.sync();
      this.settle(runtime);
      this.deps.roomSystem().evaluate(avatar);
      return;
    }

    if (avatar.isHidden) {
      const entrance = this.deps.mapManager.map.entrance;
      avatar.body.setPosition(entrance.x, entrance.y);
      avatar.body.face('up');
      avatar.setHidden(false, true);
    }
    this.walkTo(runtime, target, () => this.deps.onArrived(employeeId, placement));
  }

  /** The real person connected from another browser: network positions now drive this avatar. */
  attachRemote(employeeId: UUID, position: Vector2, direction: Direction): void {
    const runtime = this.runtimes.get(employeeId);
    if (!runtime) return;
    this.deps.autoMovement.cancel(employeeId);
    this.deps.roomManager.releaseSpot(employeeId);
    runtime.wanderAt = null;
    const avatar = runtime.avatar;
    avatar.setController('REMOTE');
    avatar.body.setPosition(position.x, position.y);
    avatar.body.face(direction);
    if (avatar.isHidden) avatar.setHidden(false, true);
    if (avatar.body instanceof RemotePlayer) avatar.body.applyServerPosition(position, direction);
  }

  applyRemotePosition(employeeId: UUID, position: Vector2, direction: Direction): void {
    const runtime = this.runtimes.get(employeeId);
    if (!runtime) return;
    if (runtime.avatar.controller !== 'REMOTE') {
      this.attachRemote(employeeId, position, direction);
      return;
    }
    if (runtime.avatar.body instanceof RemotePlayer) runtime.avatar.body.applyServerPosition(position, direction);
  }

  /** Remote person left: the simulation takes the avatar back and re-applies its placement. */
  detachRemote(employeeId: UUID): void {
    const runtime = this.runtimes.get(employeeId);
    if (!runtime || runtime.avatar.controller !== 'REMOTE') return;
    runtime.avatar.setController('NPC');
    if (runtime.avatar.body instanceof RemotePlayer) runtime.avatar.body.clearNetworkTarget();
    this.applyPlacement(employeeId, runtime.placement, false);
  }

  update(deltaMs: number, now: number): void {
    for (const runtime of this.runtimes.values()) {
      const { avatar } = runtime;
      if (avatar.controller === 'REMOTE') {
        if (avatar.body instanceof RemotePlayer) avatar.body.stepInterpolation(deltaMs);
        continue;
      }
      if (runtime.settled && runtime.wanderAt !== null && now >= runtime.wanderAt && !this.deps.autoMovement.isNavigating(avatar.employeeId)) {
        this.wander(runtime);
      }
    }
  }

  destroy(): void {
    for (const runtime of this.runtimes.values()) runtime.avatar.destroy();
    this.runtimes.clear();
  }

  private resolveTarget(employeeId: UUID, placement: PlacementTarget): NavigationTarget | null {
    if (placement.kind === 'DESK') {
      const seat = this.deps.deskManager.seatOf(placement.deskId);
      return seat ? { position: { x: seat.x, y: seat.y }, facing: seat.facing } : null;
    }
    if (placement.kind === 'ROOM') return this.deps.roomManager.reserveSpot(placement.roomId, employeeId);
    return null;
  }

  private entranceTarget(): NavigationTarget {
    const entrance = this.deps.mapManager.map.entrance;
    return { position: { x: entrance.x, y: entrance.y }, facing: 'down' };
  }

  private walkTo(runtime: EmployeeRuntime, target: NavigationTarget, onArrive: () => void): void {
    const version = runtime.version;
    this.deps.autoMovement.navigate(runtime.avatar, target, {
      onComplete: (outcome) => {
        if (outcome !== 'arrived' || version !== runtime.version) return;
        this.settle(runtime);
        onArrive();
      },
    });
  }

  private settle(runtime: EmployeeRuntime): void {
    runtime.settled = true;
    const idle = runtime.placement.kind === 'HIDDEN' ? 'STILL' : runtime.placement.idle;
    runtime.wanderAt = idle === 'WANDER' ? this.scene.time.now + Phaser.Math.Between(5000, 11000) : null;
  }

  private wander(runtime: EmployeeRuntime): void {
    const { placement, anchor } = runtime;
    if (!anchor || placement.kind === 'HIDDEN') return;
    let target: NavigationTarget | null = null;

    if (placement.kind === 'ROOM') {
      target = this.deps.roomManager.alternateSpot(placement.roomId, runtime.avatar.employeeId);
      if (target) runtime.anchor = target;
    } else if (runtime.awayFromAnchor) {
      target = anchor;
      runtime.awayFromAnchor = false;
    } else {
      const room = this.deps.roomManager.roomAt(anchor.position);
      const point = room ? this.deps.mapManager.randomWalkablePoint(room.room.bounds, anchor.position, 110) : null;
      if (point) {
        target = { position: point, facing: 'down' };
        runtime.awayFromAnchor = true;
      }
    }

    runtime.settled = false;
    if (!target) {
      this.settle(runtime);
      return;
    }
    this.walkTo(runtime, target, () => undefined);
  }
}
