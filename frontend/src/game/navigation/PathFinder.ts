import type { Vector2 } from '@virtual-office/shared';

import type { GridCell, NavigationGrid } from './NavigationGrid';

const SQRT2 = Math.SQRT2;
const NEIGHBORS: ReadonlyArray<readonly [number, number, number]> = [
  [1, 0, 1],
  [-1, 0, 1],
  [0, 1, 1],
  [0, -1, 1],
  [1, 1, SQRT2],
  [1, -1, SQRT2],
  [-1, 1, SQRT2],
  [-1, -1, SQRT2],
];

/** Minimal binary heap keyed by f-score. */
class OpenSet {
  private readonly items: number[] = [];

  constructor(private readonly score: Float64Array) {}

  get size(): number {
    return this.items.length;
  }

  push(index: number): void {
    const items = this.items;
    items.push(index);
    let child = items.length - 1;
    while (child > 0) {
      const parent = (child - 1) >> 1;
      if ((this.score[items[parent] as number] as number) <= (this.score[index] as number)) break;
      items[child] = items[parent] as number;
      child = parent;
    }
    items[child] = index;
  }

  pop(): number {
    const items = this.items;
    const top = items[0] as number;
    const last = items.pop() as number;
    if (items.length > 0) {
      let parent = 0;
      const lastScore = this.score[last] as number;
      for (;;) {
        let child = parent * 2 + 1;
        if (child >= items.length) break;
        const right = child + 1;
        if (right < items.length && (this.score[items[right] as number] as number) < (this.score[items[child] as number] as number)) child = right;
        if ((this.score[items[child] as number] as number) >= lastScore) break;
        items[parent] = items[child] as number;
        parent = child;
      }
      items[parent] = last;
    }
    return top;
  }
}

/**
 * Grid A* (8-directional, no diagonal corner cutting) followed by
 * line-of-sight smoothing, so avatars walk natural straight lines through
 * doors instead of staircase paths.
 */
export class PathFinder {
  constructor(private readonly grid: NavigationGrid) {}

  /** World-space waypoints from (excluding) `from` to (including) `to`; null when unreachable. */
  findPath(from: Vector2, to: Vector2): Vector2[] | null {
    const grid = this.grid;
    const start = grid.nearestWalkable(grid.worldToCell(from));
    const goal = grid.nearestWalkable(grid.worldToCell(to));
    if (!start || !goal) return null;

    const cells = this.search(start, goal);
    if (!cells) return null;

    const points = compressToTurns(cells).map((cell) => grid.cellToWorld(cell));
    const smoothed = this.smooth([from, ...points]);
    smoothed.shift();
    smoothed.push({ x: to.x, y: to.y });
    return smoothed;
  }

  private search(start: GridCell, goal: GridCell): GridCell[] | null {
    const { cols, rows } = this.grid;
    const total = cols * rows;
    const gScore = new Float64Array(total).fill(Number.POSITIVE_INFINITY);
    const fScore = new Float64Array(total).fill(Number.POSITIVE_INFINITY);
    const cameFrom = new Int32Array(total).fill(-1);
    const closed = new Uint8Array(total);
    const startIndex = start.y * cols + start.x;
    const goalIndex = goal.y * cols + goal.x;

    const heuristic = (x: number, y: number) => {
      const dx = Math.abs(x - goal.x);
      const dy = Math.abs(y - goal.y);
      return dx + dy + (SQRT2 - 2) * Math.min(dx, dy);
    };

    gScore[startIndex] = 0;
    fScore[startIndex] = heuristic(start.x, start.y);
    const open = new OpenSet(fScore);
    open.push(startIndex);

    while (open.size > 0) {
      const current = open.pop();
      if (current === goalIndex) return this.reconstruct(cameFrom, current);
      if (closed[current]) continue;
      closed[current] = 1;

      const cx = current % cols;
      const cy = (current - cx) / cols;
      for (const [dx, dy, cost] of NEIGHBORS) {
        const nx = cx + dx;
        const ny = cy + dy;
        if (!this.grid.isWalkable({ x: nx, y: ny })) continue;
        if (dx !== 0 && dy !== 0 && (!this.grid.isWalkable({ x: cx + dx, y: cy }) || !this.grid.isWalkable({ x: cx, y: cy + dy }))) {
          continue;
        }
        const neighbor = ny * cols + nx;
        if (closed[neighbor]) continue;
        const tentative = (gScore[current] as number) + cost;
        if (tentative < (gScore[neighbor] as number)) {
          cameFrom[neighbor] = current;
          gScore[neighbor] = tentative;
          fScore[neighbor] = tentative + heuristic(nx, ny);
          open.push(neighbor);
        }
      }
    }
    return null;
  }

  private reconstruct(cameFrom: Int32Array, end: number): GridCell[] {
    const { cols } = this.grid;
    const path: GridCell[] = [];
    let current = end;
    while (current !== -1) {
      path.push({ x: current % cols, y: Math.floor(current / cols) });
      current = cameFrom[current] as number;
    }
    return path.reverse();
  }

  /** String-pulling over turn points: keep the furthest point still in line of sight. */
  private smooth(points: Vector2[]): Vector2[] {
    if (points.length <= 2) return points;
    const result: Vector2[] = [points[0] as Vector2];
    let anchor = 0;
    while (anchor < points.length - 1) {
      let furthest = anchor + 1;
      for (let candidate = points.length - 1; candidate > anchor + 1; candidate -= 1) {
        if (this.grid.hasLineOfSight(points[anchor] as Vector2, points[candidate] as Vector2)) {
          furthest = candidate;
          break;
        }
      }
      result.push(points[furthest] as Vector2);
      anchor = furthest;
    }
    return result;
  }
}

/** Drops cells that continue in the same direction, leaving only corners (plus both ends). */
function compressToTurns(cells: GridCell[]): GridCell[] {
  if (cells.length <= 2) return cells;
  const result: GridCell[] = [cells[0] as GridCell];
  for (let index = 1; index < cells.length - 1; index += 1) {
    const previous = cells[index - 1] as GridCell;
    const current = cells[index] as GridCell;
    const next = cells[index + 1] as GridCell;
    const sameDirection = current.x - previous.x === next.x - current.x && current.y - previous.y === next.y - current.y;
    if (!sameDirection) result.push(current);
  }
  result.push(cells[cells.length - 1] as GridCell);
  return result;
}
