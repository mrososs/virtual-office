import type { Vector2 } from '@virtual-office/shared';
import Phaser from 'phaser';

import { GAME_EVENTS, gameBridge } from '@/game/bridge';
import { renderScaleOf } from '@/game/rendering/render-scale';

export const MIN_ZOOM = 0.6;
export const MAX_ZOOM = 1.6;
const FOLLOW_LERP = 0.1;

/**
 * Camera policy: smooth follow of the local player inside world bounds,
 * user zoom (buttons / wheel), and temporary focus pans that hand control
 * back to the player on the next manual input. "Zoom" here is the user-facing
 * value; the device pixel ratio is applied on top.
 */
export class CameraManager {
  private zoom = 1;
  private following = true;
  private target: Phaser.GameObjects.Container | null = null;
  private world = { width: 0, height: 0 };
  private readonly dpr: number;

  constructor(private readonly scene: Phaser.Scene) {
    this.dpr = renderScaleOf(scene).dpr;
  }

  private get camera(): Phaser.Cameras.Scene2D.Camera {
    return this.scene.cameras.main;
  }

  setup(worldWidth: number, worldHeight: number, target: Phaser.GameObjects.Container, zoom: number | null): void {
    this.target = target;
    this.world = { width: worldWidth, height: worldHeight };
    this.camera.setBackgroundColor('#0c0f15');
    this.zoom = Phaser.Math.Clamp(zoom ?? this.fitZoom(), MIN_ZOOM, MAX_ZOOM);
    this.camera.setZoom(this.zoom * this.dpr);
    this.updateBounds();
    this.camera.startFollow(target, false, FOLLOW_LERP, FOLLOW_LERP);
    this.camera.centerOn(target.x, target.y);

    this.scene.input.on('wheel', this.handleWheel);
    this.scene.scale.on(Phaser.Scale.Events.RESIZE, this.updateBounds);
    this.emit();
  }

  setZoom(zoom: number, animate = true): void {
    const next = Phaser.Math.Clamp(zoom, MIN_ZOOM, MAX_ZOOM);
    if (Math.abs(next - this.zoom) < 0.0005) return;
    this.zoom = next;
    this.updateBounds();
    if (animate) this.camera.zoomTo(next * this.dpr, 180, 'Sine.easeOut', true);
    else this.camera.setZoom(next * this.dpr);
    this.emit();
  }

  focusOn(point: Vector2): void {
    this.camera.stopFollow();
    this.following = false;
    this.camera.pan(point.x, point.y - 20, 650, 'Sine.easeInOut', true);
    this.emit();
  }

  followPlayer(): void {
    if (!this.target) return;
    if (!this.following) {
      this.camera.startFollow(this.target, false, FOLLOW_LERP, FOLLOW_LERP);
      this.following = true;
      this.emit();
    }
  }

  /** Called when the human moves: the camera always comes back to them. */
  onManualInput(): void {
    if (!this.following) this.followPlayer();
  }

  destroy(): void {
    this.scene.input.off('wheel', this.handleWheel);
    this.scene.scale.off(Phaser.Scale.Events.RESIZE, this.updateBounds);
  }

  /** Default zoom: the whole floor when the viewport allows it, never smaller than readable. */
  private fitZoom(): number {
    const cssWidth = this.camera.width / this.dpr;
    const cssHeight = this.camera.height / this.dpr;
    const fit = Math.min(cssWidth / this.world.width, cssHeight / this.world.height);
    return Math.round(Phaser.Math.Clamp(fit, 0.8, 1.15) * 100) / 100;
  }

  /**
   * Phaser pins a world smaller than the view to its top-left corner; widen
   * the bounds symmetrically instead so the floor stays centered.
   */
  private readonly updateBounds = (): void => {
    const viewWidth = this.camera.width / (this.zoom * this.dpr);
    const viewHeight = this.camera.height / (this.zoom * this.dpr);
    const padX = Math.max(0, (viewWidth - this.world.width) / 2);
    const padY = Math.max(0, (viewHeight - this.world.height) / 2);
    this.camera.setBounds(-padX, -padY, this.world.width + padX * 2, this.world.height + padY * 2);
  };

  private readonly handleWheel = (_pointer: Phaser.Input.Pointer, _over: unknown, _dx: number, deltaY: number): void => {
    // Proportional to the delta: one mouse-wheel notch ≈ 13%, trackpad scrolls stay smooth.
    this.setZoom(this.zoom * Math.exp(-deltaY * 0.001), false);
  };

  private emit(): void {
    gameBridge.emit(GAME_EVENTS.CAMERA_CHANGED, { zoom: Math.round(this.zoom * 100) / 100, followingPlayer: this.following });
  }
}
