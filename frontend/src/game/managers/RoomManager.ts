import type { Room, UUID, Vector2 } from '@virtual-office/shared';
import type Phaser from 'phaser';

import { isPointInBounds } from '@/game/interactions/zone-detection';
import type { NavigationTarget } from '@/game/navigation/NavigationTarget';
import { RoomVisual } from '@/game/rooms/RoomVisual';

import type { OfficeMapManager } from './OfficeMapManager';

/**
 * Owns RoomVisuals for the loaded floor, live occupancy counts, and seat
 * reservations so two avatars never walk to the same chair.
 */
export class RoomManager {
  private readonly visuals = new Map<UUID, RoomVisual>();
  /** roomId -> spot index -> employeeId */
  private readonly reservations = new Map<UUID, Map<number, UUID>>();
  private selectedRoomId: UUID | null = null;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly mapManager: OfficeMapManager,
  ) {}

  load(rooms: Room[]): RoomVisual[] {
    this.clear();
    for (const room of rooms) {
      this.visuals.set(room.id, new RoomVisual(this.scene, room, this.mapManager.layoutFor(room.id)));
    }
    return this.getRoomVisuals();
  }

  getRoomVisuals(): RoomVisual[] {
    return [...this.visuals.values()];
  }

  findById(roomId: UUID): RoomVisual | undefined {
    return this.visuals.get(roomId);
  }

  roomAt(point: Vector2): RoomVisual | undefined {
    return this.getRoomVisuals().find((visual) => isPointInBounds(point, visual.room.bounds));
  }

  /** Reserves the first free seat in the room, or a free standing point when every seat is taken. */
  reserveSpot(roomId: UUID, employeeId: UUID): NavigationTarget | null {
    this.releaseSpot(employeeId);
    const visual = this.visuals.get(roomId);
    if (!visual) return null;
    const spots = this.mapManager.layoutFor(roomId)?.spots ?? [];
    let taken = this.reservations.get(roomId);
    if (!taken) {
      taken = new Map();
      this.reservations.set(roomId, taken);
    }
    for (let index = 0; index < spots.length; index += 1) {
      const spot = spots[index];
      if (spot && !taken.has(index)) {
        taken.set(index, employeeId);
        return { position: { x: spot.x, y: spot.y }, facing: spot.facing, roomId };
      }
    }
    const point = this.mapManager.randomWalkablePoint(visual.room.bounds);
    return point ? { position: point, facing: 'down', roomId } : { position: visual.room.navigationTarget, roomId };
  }

  /** A different free spot in the same room, for idle wandering. */
  alternateSpot(roomId: UUID, employeeId: UUID): NavigationTarget | null {
    const spots = this.mapManager.layoutFor(roomId)?.spots ?? [];
    const taken = this.reservations.get(roomId) ?? new Map<number, UUID>();
    const free = spots.map((spot, index) => ({ spot, index })).filter(({ index }) => !taken.has(index));
    const choice = free[Math.floor(Math.random() * free.length)];
    if (!choice) return null;
    this.releaseSpot(employeeId);
    taken.set(choice.index, employeeId);
    this.reservations.set(roomId, taken);
    return { position: { x: choice.spot.x, y: choice.spot.y }, facing: choice.spot.facing, roomId };
  }

  releaseSpot(employeeId: UUID): void {
    for (const taken of this.reservations.values()) {
      for (const [index, holder] of taken) if (holder === employeeId) taken.delete(index);
    }
  }

  setOccupancy(roomId: UUID, count: number): void {
    this.visuals.get(roomId)?.setOccupancy(count);
  }

  setSelected(roomId: UUID | null): void {
    if (this.selectedRoomId === roomId) return;
    if (this.selectedRoomId) this.visuals.get(this.selectedRoomId)?.setSelected(false);
    this.selectedRoomId = roomId;
    if (roomId) this.visuals.get(roomId)?.setSelected(true);
  }

  tick(now: number): void {
    for (const visual of this.visuals.values()) visual.tick(now);
  }

  clear(): void {
    for (const visual of this.visuals.values()) visual.destroy();
    this.visuals.clear();
    this.reservations.clear();
  }
}
