import type { Bounds, Vector2 } from '@virtual-office/shared';

export interface GridCell {
  x: number;
  y: number;
}

/**
 * Walkability grid for NPC pathfinding. `blocked` marks cells covered by a
 * wall/furniture/exterior; `clearance` additionally dilates blockers by the
 * avatar radius so paths keep bodies from clipping into corners.
 */
export class NavigationGrid {
  private readonly blocked: Uint8Array;
  private readonly clearance: Uint8Array;

  private constructor(
    public readonly cellSize: number,
    public readonly cols: number,
    public readonly rows: number,
  ) {
    this.blocked = new Uint8Array(cols * rows).fill(1);
    this.clearance = new Uint8Array(cols * rows).fill(1);
  }

  static build(options: {
    width: number;
    height: number;
    cellSize: number;
    walkableAreas: Bounds[];
    blockers: Bounds[];
    clearanceCells: number;
  }): NavigationGrid {
    const cols = Math.ceil(options.width / options.cellSize);
    const rows = Math.ceil(options.height / options.cellSize);
    const grid = new NavigationGrid(options.cellSize, cols, rows);

    for (const area of options.walkableAreas) grid.fillCellsWhoseCenterIsIn(area, 0);
    for (const blocker of options.blockers) grid.fillOverlappingCells(blocker, 1);
    grid.computeClearance(options.clearanceCells);
    return grid;
  }

  worldToCell(position: Vector2): GridCell {
    return {
      x: Math.min(this.cols - 1, Math.max(0, Math.floor(position.x / this.cellSize))),
      y: Math.min(this.rows - 1, Math.max(0, Math.floor(position.y / this.cellSize))),
    };
  }

  cellToWorld(cell: GridCell): Vector2 {
    return { x: (cell.x + 0.5) * this.cellSize, y: (cell.y + 0.5) * this.cellSize };
  }

  inBounds(cell: GridCell): boolean {
    return cell.x >= 0 && cell.y >= 0 && cell.x < this.cols && cell.y < this.rows;
  }

  /** Walkable with avatar clearance — what paths are planned over. */
  isWalkable(cell: GridCell): boolean {
    return this.inBounds(cell) && this.clearance[cell.y * this.cols + cell.x] === 0;
  }

  /** Not covered by any blocker (may still be too tight for a full avatar). */
  isOpen(cell: GridCell): boolean {
    return this.inBounds(cell) && this.blocked[cell.y * this.cols + cell.x] === 0;
  }

  /** Breadth-first search for the closest walkable cell, used when a seat sits inside a clearance margin. */
  nearestWalkable(start: GridCell, maxRadius = 24): GridCell | null {
    if (this.isWalkable(start)) return start;
    const visited = new Uint8Array(this.cols * this.rows);
    const queue: GridCell[] = [start];
    visited[start.y * this.cols + start.x] = 1;
    while (queue.length > 0) {
      const cell = queue.shift() as GridCell;
      if (Math.abs(cell.x - start.x) > maxRadius || Math.abs(cell.y - start.y) > maxRadius) continue;
      if (this.isWalkable(cell)) return cell;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
        const next = { x: cell.x + dx, y: cell.y + dy };
        if (!this.inBounds(next)) continue;
        const index = next.y * this.cols + next.x;
        if (visited[index]) continue;
        visited[index] = 1;
        queue.push(next);
      }
    }
    return null;
  }

  /** Samples the segment every half cell; true when every sample is walkable. */
  hasLineOfSight(from: Vector2, to: Vector2): boolean {
    const length = Math.hypot(to.x - from.x, to.y - from.y);
    const steps = Math.max(1, Math.ceil(length / (this.cellSize / 2)));
    for (let step = 0; step <= steps; step += 1) {
      const t = step / steps;
      if (!this.isWalkable(this.worldToCell({ x: from.x + (to.x - from.x) * t, y: from.y + (to.y - from.y) * t }))) {
        return false;
      }
    }
    return true;
  }

  private fillCellsWhoseCenterIsIn(area: Bounds, value: 0 | 1): void {
    const x0 = Math.floor(area.x / this.cellSize);
    const y0 = Math.floor(area.y / this.cellSize);
    const x1 = Math.ceil((area.x + area.width) / this.cellSize);
    const y1 = Math.ceil((area.y + area.height) / this.cellSize);
    for (let y = Math.max(0, y0); y < Math.min(this.rows, y1); y += 1) {
      for (let x = Math.max(0, x0); x < Math.min(this.cols, x1); x += 1) {
        const center = this.cellToWorld({ x, y });
        if (center.x > area.x && center.x < area.x + area.width && center.y > area.y && center.y < area.y + area.height) {
          this.blocked[y * this.cols + x] = value;
        }
      }
    }
  }

  private fillOverlappingCells(area: Bounds, value: 0 | 1): void {
    const x0 = Math.floor(area.x / this.cellSize);
    const y0 = Math.floor(area.y / this.cellSize);
    const x1 = Math.ceil((area.x + area.width) / this.cellSize);
    const y1 = Math.ceil((area.y + area.height) / this.cellSize);
    for (let y = Math.max(0, y0); y < Math.min(this.rows, y1); y += 1) {
      for (let x = Math.max(0, x0); x < Math.min(this.cols, x1); x += 1) {
        this.blocked[y * this.cols + x] = value;
      }
    }
  }

  private computeClearance(radius: number): void {
    this.clearance.set(this.blocked);
    if (radius <= 0) return;
    for (let y = 0; y < this.rows; y += 1) {
      for (let x = 0; x < this.cols; x += 1) {
        if (this.blocked[y * this.cols + x] !== 1) continue;
        for (let dy = -radius; dy <= radius; dy += 1) {
          for (let dx = -radius; dx <= radius; dx += 1) {
            const nx = x + dx;
            const ny = y + dy;
            if (nx >= 0 && ny >= 0 && nx < this.cols && ny < this.rows) this.clearance[ny * this.cols + nx] = 1;
          }
        }
      }
    }
  }
}
