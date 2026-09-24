import type { UUID } from '@virtual-office/shared';
import Phaser from 'phaser';

import {
  GAME_EVENTS,
  gameBridge,
  OfficeCommandRouter,
  type NavigationRequest,
  type OfficeCommandHandlers,
  type OfficeInitPayload,
} from '@/game/bridge';
import { installDebugHandle } from '@/game/debug/debug-handle';
import type { EmployeeAvatar } from '@/game/entities/EmployeeAvatar';
import type { DeskOwner } from '@/game/entities/Desk';
import { CameraManager } from '@/game/managers/CameraManager';
import { DeskManager } from '@/game/managers/DeskManager';
import { EmployeeManager } from '@/game/managers/EmployeeManager';
import { InteractionManager } from '@/game/managers/InteractionManager';
import { MeetingRoomManager } from '@/game/managers/MeetingRoomManager';
import { OfficeMapManager } from '@/game/managers/OfficeMapManager';
import { PlayerManager } from '@/game/managers/PlayerManager';
import { RoomManager } from '@/game/managers/RoomManager';
import type { NavigationTarget } from '@/game/navigation/NavigationTarget';
import { PathFinder } from '@/game/navigation/PathFinder';
import { OfficeSocket } from '@/game/network/OfficeSocket';
import { PlayerSync } from '@/game/network/PlayerSync';
import { PresenceSync } from '@/game/network/PresenceSync';
import { AnimationSystem } from '@/game/systems/AnimationSystem';
import { AutoMovementSystem } from '@/game/systems/AutoMovementSystem';
import { CollisionSystem } from '@/game/systems/CollisionSystem';
import { InteractionSystem } from '@/game/systems/InteractionSystem';
import { MovementSystem } from '@/game/systems/MovementSystem';
import { PresenceSystem } from '@/game/systems/PresenceSystem';
import { RoomSystem } from '@/game/systems/RoomSystem';
import { NO_MOVEMENT_INPUT, type MovementInputState } from '@/game/types';
import { hexToNumber } from '@/shared/constants/activity-meta';

interface OfficeWorld {
  localEmployeeId: UUID;
  map: OfficeMapManager;
  rooms: RoomManager;
  meetings: MeetingRoomManager;
  desks: DeskManager;
  players: PlayerManager;
  employees: EmployeeManager;
  camera: CameraManager;
  collision: CollisionSystem;
  autoMovement: AutoMovementSystem;
  interaction: InteractionSystem;
  animation: AnimationSystem;
  roomSystem: RoomSystem;
  presence: PresenceSystem;
  realtime: { socket: OfficeSocket; playerSync: PlayerSync; presenceSync: PresenceSync } | null;
}

type KeyName = 'w' | 'a' | 's' | 'd' | 'up' | 'down' | 'left' | 'right';

/**
 * Orchestrates the office floor. This class MUST stay small: it builds
 * managers/systems when Vue sends OFFICE_INIT, routes Vue commands to them,
 * and runs the per-frame update in a fixed order. All behavior lives in
 * `game/systems` and `game/managers`; all networking lives in `game/network`.
 */
export class OfficeScene extends Phaser.Scene {
  private router: OfficeCommandRouter | null = null;
  private world: OfficeWorld | null = null;
  private keys: Record<KeyName, Phaser.Input.Keyboard.Key> | null = null;
  private failed = false;
  private disposeDebugHandle: () => void = () => undefined;

  constructor() {
    super('OfficeScene');
  }

  create(): void {
    this.router = new OfficeCommandRouter(this.commandHandlers());
    this.router.attach();
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.teardown, this);
    this.events.once(Phaser.Scenes.Events.DESTROY, this.teardown, this);
    this.setupKeyboard();
    gameBridge.emit(GAME_EVENTS.GAME_READY, undefined);
  }

  update(time: number, delta: number): void {
    const world = this.world;
    if (!world || this.failed) return;
    try {
      const manual = world.players.update(this.readInput());
      if (manual) world.camera.onManualInput();
      world.autoMovement.update(delta);
      world.employees.update(delta, time);

      // Materialized: several systems iterate it this frame.
      const avatars = [...this.allAvatars(world)];
      world.animation.update(avatars);
      world.roomSystem.update(delta, avatars);
      world.desks.update(delta, (id) => this.findAvatar(world, id), (id) => world.presence.statusOf(id));
      world.meetings.update(delta);

      const local = world.players.getLocalPlayer();
      if (local) {
        world.interaction.updateProximity(delta, {
          local,
          avatars: world.employees.avatars(),
          desks: world.desks.all(),
          currentRoom: world.rooms.roomAt(local.position),
          deskLabel: (desk) => world.desks.labelFor(desk),
        });
        world.realtime?.playerSync.report(local.position, local.body.direction, local.isMoving, time);
      }
    } catch (error) {
      this.failed = true;
      console.error('[office] update loop failed', error);
      gameBridge.emit(GAME_EVENTS.GAME_ERROR, { message: error instanceof Error ? error.message : 'The office stopped responding' });
    }
  }

  private commandHandlers(): OfficeCommandHandlers {
    return {
      [GAME_EVENTS.OFFICE_INIT]: (payload) => this.initializeOffice(payload),
      [GAME_EVENTS.RESET_OFFICE]: (payload) => {
        const world = this.requireWorld();
        for (const state of payload.employees) {
          world.presence.apply(state.status);
          world.employees.applyPlacement(state.status.employeeId, state.placement, true);
        }
        world.presence.apply(payload.localPlayer);
        world.meetings.applyAll(payload.roomMeetings);
      },
      [GAME_EVENTS.SET_EMPLOYEE_STATUS]: (view) => this.world?.presence.apply(view),
      [GAME_EVENTS.MOVE_EMPLOYEE]: ({ employeeId, placement }) => {
        const world = this.world;
        if (world && employeeId !== world.localEmployeeId) world.employees.applyPlacement(employeeId, placement, false);
      },
      [GAME_EVENTS.SET_ROOM_MEETING]: (state) => this.world?.meetings.apply(state),
      [GAME_EVENTS.SET_SELECTION]: ({ employeeId, roomId, deskId }) => {
        const world = this.world;
        if (!world) return;
        for (const avatar of this.allAvatars(world)) avatar.setSelected(avatar.employeeId === employeeId);
        world.rooms.setSelected(roomId);
        world.desks.setSelected(deskId);
      },
      [GAME_EVENTS.FOCUS_EMPLOYEE]: ({ employeeId }) => {
        const world = this.world;
        const avatar = world ? this.findAvatar(world, employeeId) : undefined;
        if (!world || !avatar || avatar.isHidden) return;
        if (avatar.isLocal) world.camera.followPlayer();
        else world.camera.focusOn(avatar.position);
        avatar.pulse();
      },
      [GAME_EVENTS.FOCUS_ROOM]: ({ roomId }) => {
        const room = this.world?.rooms.findById(roomId);
        if (!room) return;
        const { x, y, width, height } = room.room.bounds;
        this.world?.camera.focusOn({ x: x + width / 2, y: y + height / 2 + 20 });
      },
      [GAME_EVENTS.RECENTER_CAMERA]: () => this.world?.camera.followPlayer(),
      [GAME_EVENTS.SET_ZOOM]: ({ zoom }) => this.world?.camera.setZoom(zoom),
      [GAME_EVENTS.NAVIGATE_LOCAL_PLAYER]: ({ request, label }) => this.navigateLocalPlayer(request, label),
      [GAME_EVENTS.CANCEL_LOCAL_NAVIGATION]: () => {
        const world = this.world;
        if (world) world.autoMovement.cancel(world.localEmployeeId, 'cancelled');
      },
    };
  }

  private initializeOffice(payload: OfficeInitPayload): void {
    this.teardownWorld();
    this.failed = false;
    const localEmployeeId = payload.localPlayer.status.employeeId;

    const map = new OfficeMapManager(this);
    map.build(payload.map, payload.desks);
    this.physics.world.setBounds(0, 0, payload.map.width, payload.map.height);

    const movement = new MovementSystem(this);
    const collision = new CollisionSystem(this);
    collision.registerBlockers(map.blockers);
    const autoMovement = new AutoMovementSystem(this, new PathFinder(map.grid), movement);
    const interaction = new InteractionSystem(this);

    const rooms = new RoomManager(this, map);
    const roomVisuals = rooms.load(payload.rooms);
    const meetings = new MeetingRoomManager(rooms);
    meetings.applyAll(payload.roomMeetings);

    const owners = new Map<UUID, DeskOwner>();
    for (const state of [payload.localPlayer, ...payload.employees]) {
      owners.set(state.status.employeeId, {
        employeeId: state.status.employeeId,
        displayName: state.status.displayName,
        accent: hexToNumber(state.appearance.shirt),
      });
    }
    const desks = new DeskManager(this);
    desks.load(payload.desks, owners);

    let roomSystem: RoomSystem | null = null;
    const employees = new EmployeeManager(this, {
      autoMovement,
      roomManager: rooms,
      deskManager: desks,
      mapManager: map,
      interaction,
      roomSystem: () => roomSystem as RoomSystem,
      onArrived: (employeeId, placement) => gameBridge.emit(GAME_EVENTS.EMPLOYEE_ARRIVED, { employeeId, placement }),
    });
    roomSystem = new RoomSystem(this, roomVisuals, (employeeId, roomId, previousRoomId) => {
      for (const id of [roomId, previousRoomId]) if (id) rooms.setOccupancy(id, roomSystem?.occupantsOf(id).length ?? 0);
      if (employeeId === localEmployeeId && previousRoomId) rooms.releaseSpot(localEmployeeId);
    });

    const players = new PlayerManager(this, movement, autoMovement);
    const local = players.spawn(payload.localPlayer, payload.map.playerSpawn);
    interaction.registerEmployee(local);
    collision.attachPlayer(local.body);

    const world: OfficeWorld = {
      localEmployeeId,
      map,
      rooms,
      meetings,
      desks,
      players,
      employees,
      camera: new CameraManager(this),
      collision,
      autoMovement,
      interaction,
      animation: new AnimationSystem(this),
      roomSystem,
      presence: new PresenceSystem(this, (id) => this.findAvatar(world, id)),
      realtime: null,
    };
    this.world = world;

    new InteractionManager(interaction).registerStatic({ desks: desks.all(), rooms: roomVisuals, furniture: map.furniture });
    employees.spawnAll(payload.employees);
    for (const state of [payload.localPlayer, ...payload.employees]) world.presence.apply(state.status);
    world.camera.setup(payload.map.width, payload.map.height, local.body, payload.zoom);
    world.realtime = payload.realtime ? this.connectRealtime(world, payload.realtime.officeId) : null;
    if (!payload.realtime) gameBridge.emit(GAME_EVENTS.REALTIME_STATUS_CHANGED, { status: 'disabled' });

    this.disposeDebugHandle = installDebugHandle(() => (this.world === world ? this.debugSnapshot(world) : null), this);
    gameBridge.emit(GAME_EVENTS.OFFICE_LOADED, { floorKey: payload.map.key });
  }

  private debugSnapshot(world: OfficeWorld) {
    const avatars = [...this.allAvatars(world)].map((avatar) => ({
      employeeId: avatar.employeeId,
      x: Math.round(avatar.position.x),
      y: Math.round(avatar.position.y),
      hidden: avatar.isHidden,
      controller: avatar.controller,
      controlMode: avatar.body.controlMode,
      navigating: world.autoMovement.isNavigating(avatar.employeeId),
      roomId: world.roomSystem.roomOf(avatar.employeeId),
    }));
    const occupancy = Object.fromEntries(world.rooms.getRoomVisuals().map((room) => [room.roomId, world.roomSystem.occupantsOf(room.roomId)]));
    const camera = this.cameras.main;
    const dpr = this.scale.zoom > 0 ? 1 / this.scale.zoom : 1;
    return { avatars, occupancy, camera: { x: camera.worldView.x, y: camera.worldView.y, scale: camera.zoom / dpr } };
  }

  private connectRealtime(world: OfficeWorld, officeId: UUID): OfficeWorld['realtime'] {
    const socket = new OfficeSocket((status) => gameBridge.emit(GAME_EVENTS.REALTIME_STATUS_CHANGED, { status }));
    const playerSync = new PlayerSync(socket, world.localEmployeeId, {
      onRemotePosition: (employeeId, position, direction) => world.employees.applyRemotePosition(employeeId, position, direction),
    });
    const presenceSync = new PresenceSync(socket, world.localEmployeeId, {
      onJoined: (employeeId, position, direction) => world.employees.attachRemote(employeeId, position, direction),
      onLeft: (employeeId) => world.employees.detachRemote(employeeId),
      onLiveEmployeesChanged: (employeeIds) => gameBridge.emit(GAME_EVENTS.LIVE_EMPLOYEES_CHANGED, { employeeIds }),
    });
    socket.connect(
      () => {
        const local = world.players.getLocalPlayer();
        if (local) playerSync.join(officeId, local.position, local.body.direction);
      },
      () => presenceSync.clear(),
    );
    playerSync.start();
    presenceSync.start();
    return { socket, playerSync, presenceSync };
  }

  private navigateLocalPlayer(request: NavigationRequest, label: string): void {
    const world = this.requireWorld();
    const local = world.players.getLocalPlayer();
    if (!local) return;
    const target = this.resolveLocalTarget(world, request);
    if (!target) {
      gameBridge.emit(GAME_EVENTS.LOCAL_NAVIGATION_CHANGED, { label: null, outcome: 'unreachable' });
      return;
    }
    world.camera.followPlayer();
    gameBridge.emit(GAME_EVENTS.LOCAL_NAVIGATION_CHANGED, { label });
    world.autoMovement.navigate(local, target, {
      onComplete: (outcome) => gameBridge.emit(GAME_EVENTS.LOCAL_NAVIGATION_CHANGED, { label: null, outcome }),
    });
  }

  private resolveLocalTarget(world: OfficeWorld, request: NavigationRequest): NavigationTarget | null {
    if (request.kind === 'ROOM') return world.rooms.reserveSpot(request.roomId, world.localEmployeeId);
    if (request.kind === 'DESK') {
      const seat = world.desks.seatOf(request.deskId);
      return seat ? { position: { x: seat.x, y: seat.y }, facing: seat.facing } : null;
    }
    const avatar = world.employees.get(request.employeeId);
    if (!avatar || avatar.isHidden) return null;
    const room = world.rooms.roomAt(avatar.position);
    const bounds = room?.room.bounds ?? { x: avatar.position.x - 80, y: avatar.position.y - 80, width: 160, height: 160 };
    const near = world.map.randomWalkablePoint(bounds, avatar.position, 48);
    return near ? { position: near, facing: avatar.position.x < near.x ? 'left' : 'right' } : null;
  }

  private setupKeyboard(): void {
    const keyboard = this.input.keyboard;
    if (!keyboard) return;
    keyboard.disableGlobalCapture();
    this.keys = keyboard.addKeys(
      { w: 'W', a: 'A', s: 'S', d: 'D', up: 'UP', down: 'DOWN', left: 'LEFT', right: 'RIGHT' },
      false,
    ) as Record<KeyName, Phaser.Input.Keyboard.Key>;
    keyboard.on('keydown-E', () => {
      if (!isTypingInForm()) this.world?.interaction.triggerCurrent();
    });
  }

  private readInput(): MovementInputState {
    const keys = this.keys;
    if (!keys || isTypingInForm()) return NO_MOVEMENT_INPUT;
    return {
      up: keys.w.isDown || keys.up.isDown,
      down: keys.s.isDown || keys.down.isDown,
      left: keys.a.isDown || keys.left.isDown,
      right: keys.d.isDown || keys.right.isDown,
    };
  }

  private *allAvatars(world: OfficeWorld): Generator<EmployeeAvatar> {
    const local = world.players.getLocalPlayer();
    if (local) yield local;
    yield* world.employees.avatars();
  }

  private findAvatar(world: OfficeWorld, employeeId: UUID): EmployeeAvatar | undefined {
    const local = world.players.getLocalPlayer();
    return local?.employeeId === employeeId ? local : world.employees.get(employeeId);
  }

  private requireWorld(): OfficeWorld {
    if (!this.world) throw new Error('Office is not initialized yet');
    return this.world;
  }

  private teardownWorld(): void {
    const world = this.world;
    if (!world) return;
    this.world = null;
    this.disposeDebugHandle();
    if (world.realtime) {
      world.realtime.playerSync.stop();
      world.realtime.presenceSync.stop();
      world.realtime.socket.disconnect();
    }
    world.camera.destroy();
    world.employees.destroy();
    world.players.destroy();
    world.desks.clear();
    world.rooms.clear();
    world.map.destroy();
    world.collision.destroy();
  }

  private teardown(): void {
    this.router?.detach();
    this.router = null;
    this.teardownWorld();
  }
}

function isTypingInForm(): boolean {
  const element = document.activeElement;
  if (!(element instanceof HTMLElement)) return false;
  return element.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(element.tagName);
}
