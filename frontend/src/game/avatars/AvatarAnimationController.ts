import type { Direction } from '@virtual-office/shared';

import { viewForDirection } from './avatar-frame';
import type { AvatarFrameTarget, AvatarPose } from './avatar.types';

type Motion = 'idle' | 'walk';

interface ClipFrame {
  pose: AvatarPose;
  ms: number;
}

const WALK_FRAME_MS = 1000 / 9;

/** Walk cycle at 9 fps, and a slow "breathing" idle. */
const CLIPS: Readonly<Record<Motion, readonly ClipFrame[]>> = {
  walk: [
    { pose: 'stepA', ms: WALK_FRAME_MS },
    { pose: 'idle', ms: WALK_FRAME_MS },
    { pose: 'stepB', ms: WALK_FRAME_MS },
    { pose: 'idle', ms: WALK_FRAME_MS },
  ],
  idle: [
    { pose: 'idle', ms: 1500 },
    { pose: 'breathe', ms: 700 },
  ],
};

/**
 * The one clock behind an avatar's animation (idle/walk × 4 directions).
 * It never animates layers individually: it decides a single (view, pose,
 * flip) and hands it to the target, which applies it to every layer at
 * once — so layers cannot drift apart. No Phaser dependency: the creator's
 * canvas preview runs the same controller.
 */
export class AvatarAnimationController {
  private motion: Motion = 'idle';
  private frameIndex = 0;
  private elapsedMs: number;

  constructor(
    private readonly target: AvatarFrameTarget,
    private readonly random: () => number = Math.random,
  ) {
    // Desynchronize idle breathing across avatars.
    this.elapsedMs = this.random() * (CLIPS.idle[0]?.ms ?? 0);
  }

  /** Per-frame; allocation-free. Only touches the target when the visible frame changes (the target dedupes). */
  update(direction: Direction, moving: boolean, deltaMs: number): void {
    const motion: Motion = moving ? 'walk' : 'idle';
    if (motion !== this.motion) {
      this.motion = motion;
      this.frameIndex = 0;
      // A step shows immediately; a new idle starts at a random point of its first pose.
      this.elapsedMs = moving ? 0 : this.random() * 600;
    } else {
      this.elapsedMs += deltaMs;
      const clip = CLIPS[motion];
      let frame = clip[this.frameIndex];
      while (frame && this.elapsedMs >= frame.ms) {
        this.elapsedMs -= frame.ms;
        this.frameIndex = (this.frameIndex + 1) % clip.length;
        frame = clip[this.frameIndex];
      }
    }
    const { view, flip } = viewForDirection(direction);
    this.target.showFrame(view, CLIPS[this.motion][this.frameIndex]?.pose ?? 'idle', flip);
  }
}
