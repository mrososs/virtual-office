import type { Bounds, Desk, UUID, Vector2 } from '@virtual-office/shared';
import Phaser from 'phaser';

import { COMPANY_BRANDING } from '@/core/config/branding';
import { CompanySign } from '@/game/entities/CompanySign';
import { InteractiveObjectEntity } from '@/game/entities/InteractiveObject';
import { deskBounds, furnitureBounds, wallBounds } from '@/game/maps/map-geometry';
import { OfficeMapRenderer } from '@/game/maps/OfficeMapRenderer';
import type { OfficeMapDefinition, RoomLayout } from '@/game/maps/office-map.types';
import { NavigationGrid } from '@/game/navigation/NavigationGrid';
import { FURNITURE_CATALOG } from '@/game/rendering/furniture-textures';

const NAV_CELL_SIZE = 8;
const BLOCKER_INSET = 2;

/**
 * Builds the active floor from an `OfficeMapDefinition`: static drawing,
 * furniture entities, collision blockers and the navigation grid. The scene
 * asks this manager for geometry instead of reading the definition directly.
 */
export class OfficeMapManager {
  public map!: OfficeMapDefinition;
  public grid!: NavigationGrid;
  public blockers: Bounds[] = [];
  public furniture: InteractiveObjectEntity[] = [];
  private sign: CompanySign | null = null;

  private readonly renderer: OfficeMapRenderer;
  private readonly layoutsByRoomId = new Map<UUID, RoomLayout>();

  constructor(private readonly scene: Phaser.Scene) {
    this.renderer = new OfficeMapRenderer(scene);
  }

  build(map: OfficeMapDefinition, desks: Desk[]): void {
    this.map = map;
    this.renderer.render(map);
    this.furniture = map.furniture.map((placement) => new InteractiveObjectEntity(this.scene, placement));
    // Decorative only: deliberately not a blocker and not in the navigation grid.
    this.sign = map.signage?.companySign ? new CompanySign(this.scene, map.signage.companySign, COMPANY_BRANDING) : null;
    for (const layout of map.roomLayouts) this.layoutsByRoomId.set(layout.roomId, layout);

    const inset = (bounds: Bounds): Bounds => ({
      x: bounds.x + BLOCKER_INSET,
      y: bounds.y + BLOCKER_INSET,
      width: Math.max(1, bounds.width - BLOCKER_INSET * 2),
      height: Math.max(1, bounds.height - BLOCKER_INSET * 2),
    });

    this.blockers = [
      ...map.walls.map(wallBounds),
      ...map.furniture.filter((placement) => FURNITURE_CATALOG[placement.kind].blocking).map((placement) => inset(furnitureBounds(placement))),
      ...desks.map((desk) => inset(deskBounds(desk))),
    ];

    this.grid = NavigationGrid.build({
      width: map.width,
      height: map.height,
      cellSize: NAV_CELL_SIZE,
      walkableAreas: map.footprint,
      blockers: this.blockers,
      clearanceCells: 1,
    });
  }

  layoutFor(roomId: UUID): RoomLayout | undefined {
    return this.layoutsByRoomId.get(roomId);
  }

  /** A random point avatars can stand on inside `bounds`, optionally near `near`. */
  randomWalkablePoint(bounds: Bounds, near?: Vector2, radius = 90): Vector2 | null {
    for (let attempt = 0; attempt < 40; attempt += 1) {
      const point = near
        ? { x: near.x + Phaser.Math.FloatBetween(-radius, radius), y: near.y + Phaser.Math.FloatBetween(-radius, radius) }
        : { x: Phaser.Math.FloatBetween(bounds.x + 24, bounds.x + bounds.width - 24), y: Phaser.Math.FloatBetween(bounds.y + 30, bounds.y + bounds.height - 16) };
      const inside = point.x > bounds.x + 16 && point.x < bounds.x + bounds.width - 16 && point.y > bounds.y + 30 && point.y < bounds.y + bounds.height - 12;
      if (inside && this.grid.isWalkable(this.grid.worldToCell(point))) return point;
    }
    return null;
  }

  destroy(): void {
    this.renderer.destroy();
    for (const entity of this.furniture) entity.destroy();
    this.furniture = [];
    this.sign?.destroy();
    this.sign = null;
  }
}
