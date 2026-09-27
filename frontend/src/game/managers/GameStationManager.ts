import type { Vector2 } from '@virtual-office/shared';
import type Phaser from 'phaser';

import type { GameStationView } from '@/game/bridge/GameEvents';
import { GameStationEntity } from '@/game/entities/GameStation';
import { furnitureBounds } from '@/game/maps/map-geometry';
import type { OfficeMapDefinition } from '@/game/maps/office-map.types';

/** How close the local player must be to a station's footprint for "Press E to play". */
const STATION_REACH_PX = 40;

/**
 * Game stations on the floor. Built from the map (placement + player spots);
 * their occupancy arrives from Vue as SET_GAME_STATION. Proximity is a
 * rectangle distance check over a handful of stations, run on the
 * interaction system's interval — never per frame.
 */
export class GameStationManager {
  private readonly stations = new Map<string, GameStationEntity>();

  constructor(private readonly scene: Phaser.Scene) {}

  load(map: OfficeMapDefinition): void {
    this.clear();
    for (const layout of map.stations) {
      const furniture = map.furniture.find((placement) => placement.stationId === layout.stationId);
      if (!furniture) continue;
      this.stations.set(layout.stationId, new GameStationEntity(this.scene, layout.stationId, furnitureBounds(furniture), layout.playerSpots));
    }
  }

  all(): Iterable<GameStationEntity> {
    return this.stations.values();
  }

  get(stationId: string): GameStationEntity | undefined {
    return this.stations.get(stationId);
  }

  apply(view: GameStationView): void {
    this.stations.get(view.stationId)?.render(view);
  }

  /** The station within reach of `point`, closest first. */
  nearest(point: Vector2): GameStationEntity | null {
    let best: GameStationEntity | null = null;
    let bestDistance = STATION_REACH_PX;
    for (const station of this.stations.values()) {
      const d = station.distanceTo(point);
      if (d <= bestDistance) {
        best = station;
        bestDistance = d;
      }
    }
    return best;
  }

  clear(): void {
    for (const station of this.stations.values()) station.destroy();
    this.stations.clear();
  }
}
