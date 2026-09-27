import { soundManager } from '@/core/audio';
import type { EmployeeAvatar } from '@/game/entities/EmployeeAvatar';

/** Distance between two footfalls: ~4.5 steps/s at walking speed, ~2.8 while auto-walking. */
const STRIDE_PX = 38;
/** The first step lands soon after starting to move, not a full stride later. */
const FIRST_STEP_PX = 10;

/**
 * Footsteps for the local avatar only (teammates never make noise). Steps
 * are timed by distance actually travelled, so the cadence follows speed and
 * stops the instant the avatar stops — no loop to start, restart or cut off.
 */
export class FootstepSystem {
  private travelled = STRIDE_PX - FIRST_STEP_PX;
  private lastX = Number.NaN;
  private lastY = Number.NaN;

  update(local: EmployeeAvatar): void {
    const { x, y } = local.body;
    const moving = local.isMoving && !local.isHidden;
    if (!moving || Number.isNaN(this.lastX)) {
      if (!moving) this.travelled = STRIDE_PX - FIRST_STEP_PX;
      this.lastX = x;
      this.lastY = y;
      return;
    }
    this.travelled += Math.hypot(x - this.lastX, y - this.lastY);
    this.lastX = x;
    this.lastY = y;
    // A teleport (respawn, reset) is not a step.
    if (this.travelled > STRIDE_PX * 4) this.travelled = 0;
    if (this.travelled < STRIDE_PX) return;
    this.travelled -= STRIDE_PX;
    soundManager.play('footstep');
  }
}
