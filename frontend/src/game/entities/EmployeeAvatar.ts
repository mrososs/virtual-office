import type { AvatarAppearance, Direction, UUID, Vector2 } from '@virtual-office/shared';
import Phaser from 'phaser';

import type { AvatarFactory } from '@/game/avatars/AvatarFactory';
import type { EmployeeStatusView } from '@/game/bridge/GameEvents';
import { badgeScale, badgeTextureKey, ensureBadgeTextures } from '@/game/rendering/badge-textures';
import { ensureAvatarShadowTexture } from '@/game/rendering/avatar-shadow';
import { DEPTH } from '@/game/rendering/depth';
import { renderScaleOf } from '@/game/rendering/render-scale';
import { ensureAvatarRingTexture, uiTextureScale, type AvatarRingStyle } from '@/game/rendering/ui-textures';
import { WORLD_COLORS } from '@/game/rendering/world-palette';
import { ACTIVITY_META, PRESENCE_META, hexToNumber } from '@/shared/constants/activity-meta';
import { firstNameOf } from '@/shared/utils/names';

import { AvatarLabel } from './AvatarLabel';
import { Player } from './Player';
import { RemotePlayer } from './RemotePlayer';

/** Who moves this avatar right now. */
export type AvatarController = 'LOCAL' | 'NPC' | 'REMOTE';

const LABEL_OFFSET_Y = 45;
const MOTION_EPSILON = 0.05;

export interface EmployeeAvatarOptions {
  status: EmployeeStatusView;
  appearance: AvatarAppearance;
  position: Vector2;
  facing: Direction;
  isLocal: boolean;
  avatars: AvatarFactory;
}

/**
 * Composition of an avatar body plus everything drawn around it (contact
 * shadow, selection ring, status badge, name label). Domain-to-visual mapping
 * of presence/activity lives here, not in the body sprite.
 */
export class EmployeeAvatar {
  public readonly body: Player;
  public readonly isLocal: boolean;
  public controller: AvatarController;
  public status: EmployeeStatusView;

  private readonly scene: Phaser.Scene;
  private readonly shadow: Phaser.GameObjects.Image;
  private readonly ring: Phaser.GameObjects.Image;
  private readonly badge: Phaser.GameObjects.Image;
  private readonly label: AvatarLabel;
  private hovered = false;
  private nearby = false;
  private selected = false;
  private pulseTween: Phaser.Tweens.Tween | null = null;
  private pulseGraphic: Phaser.GameObjects.Graphics | null = null;
  private lastPosition: Vector2;
  private movingFrames = 0;
  private hidden = false;

  constructor(scene: Phaser.Scene, options: EmployeeAvatarOptions) {
    this.scene = scene;
    this.isLocal = options.isLocal;
    this.controller = options.isLocal ? 'LOCAL' : 'NPC';
    this.status = options.status;
    ensureBadgeTextures(scene);

    const employeeId: UUID = options.status.employeeId;
    this.body = options.isLocal
      ? new Player(scene, employeeId, options.position, options.appearance, options.avatars)
      : new RemotePlayer(scene, employeeId, options.position, options.appearance, options.avatars);
    this.body.face(options.facing);

    const { textureScale } = renderScaleOf(scene);
    this.shadow = scene.add.image(options.position.x, options.position.y, ensureAvatarShadowTexture(scene)).setScale(1 / textureScale);
    this.ring = scene.add.image(0, 0, ensureAvatarRingTexture(scene, 'LOCAL')).setScale(uiTextureScale(scene));
    this.badge = scene.add.image(0, 0, badgeTextureKey(options.status.activity)).setScale(badgeScale(scene) * 0.9);
    this.badge.setDepth(DEPTH.AVATAR_LABEL - 1);
    this.label = new AvatarLabel(scene);
    this.lastPosition = { ...options.position };

    this.applyStatus(options.status);
    this.redrawRing();
    this.sync(0);
  }

  get employeeId(): UUID {
    return this.body.employeeId;
  }

  get position(): Vector2 {
    return { x: this.body.x, y: this.body.y };
  }

  get isHidden(): boolean {
    return this.hidden;
  }

  get isMoving(): boolean {
    return this.movingFrames > 0;
  }

  applyStatus(status: EmployeeStatusView): void {
    this.status = status;
    const showBadge = status.presence !== 'OFFLINE' && status.activity !== 'UNKNOWN' && status.activity !== 'OFFLINE';
    this.badge.setTexture(badgeTextureKey(status.activity)).setVisible(showBadge && !this.hidden);
    this.renderLabel();
  }

  setHovered(hovered: boolean): void {
    if (this.hovered === hovered) return;
    this.hovered = hovered;
    this.redrawRing();
    this.renderLabel();
  }

  setNearby(nearby: boolean): void {
    if (this.nearby === nearby) return;
    this.nearby = nearby;
    this.redrawRing();
    this.renderLabel();
  }

  setSelected(selected: boolean): void {
    if (this.selected === selected) return;
    this.selected = selected;
    this.redrawRing();
    this.renderLabel();
  }

  /** Re-skins this avatar in place (e.g. its owner saved a new look). */
  setAppearance(appearance: AvatarAppearance): void {
    this.body.setAppearance(appearance);
  }

  setController(controller: AvatarController): void {
    this.controller = controller;
    this.renderLabel();
  }

  /** Brief attention pulse, e.g. after search/focus. */
  pulse(): void {
    this.clearPulse();
    const emphasis = this.scene.add.graphics().setDepth(this.body.y - 0.4);
    this.pulseGraphic = emphasis;
    emphasis.lineStyle(2, WORLD_COLORS.accent, 1);
    emphasis.strokeEllipse(0, 0, 34, 14);
    emphasis.setPosition(this.body.x, this.body.y);
    this.pulseTween = this.scene.tweens.add({
      targets: emphasis,
      scaleX: 2.2,
      scaleY: 2.2,
      alpha: 0,
      duration: 900,
      repeat: 2,
      ease: 'Sine.easeOut',
      onUpdate: () => emphasis.setPosition(this.body.x, this.body.y),
      onComplete: () => this.clearPulse(),
    });
  }

  private clearPulse(): void {
    this.pulseTween?.remove();
    this.pulseTween = null;
    this.pulseGraphic?.destroy();
    this.pulseGraphic = null;
  }

  setHidden(hidden: boolean, animate: boolean, onDone?: () => void): void {
    this.hidden = hidden;
    const targets = [this.body, this.shadow, this.label, this.badge, this.ring];
    this.scene.tweens.killTweensOf(targets);

    if (!animate) {
      for (const target of targets) target.setAlpha(1).setVisible(!hidden);
      if (!hidden) {
        this.applyStatus(this.status);
        this.redrawRing();
      }
      onDone?.();
      return;
    }

    if (!hidden) {
      for (const target of targets) target.setAlpha(0).setVisible(true);
      this.applyStatus(this.status);
      this.redrawRing();
    }
    this.scene.tweens.add({
      targets,
      alpha: hidden ? 0 : 1,
      duration: 420,
      ease: 'Sine.easeInOut',
      onComplete: () => {
        if (hidden) for (const target of targets) target.setVisible(false).setAlpha(1);
        onDone?.();
      },
    });
  }

  /** Per-frame: motion detection, animation, depth and overlay positions. */
  sync(deltaMs: number): void {
    const { x, y } = this.body;
    const moved = Math.abs(x - this.lastPosition.x) > MOTION_EPSILON || Math.abs(y - this.lastPosition.y) > MOTION_EPSILON;
    this.movingFrames = moved ? 3 : Math.max(0, this.movingFrames - 1);
    this.lastPosition.x = x;
    this.lastPosition.y = y;
    this.body.updateMotion(this.movingFrames > 0, deltaMs);

    this.body.setDepth(y);
    this.shadow.setPosition(x, y + 1).setDepth(y - 0.8);
    this.ring.setPosition(x, y).setDepth(y - 0.6);
    this.badge.setPosition(x + 9.5, y - 38);
    this.label.setPosition(x, y - LABEL_OFFSET_Y);
  }

  destroy(): void {
    this.clearPulse();
    this.body.destroy();
    this.shadow.destroy();
    this.ring.destroy();
    this.badge.destroy();
    this.label.destroy();
  }

  private redrawRing(): void {
    const style: AvatarRingStyle | null = this.selected ? 'SELECTED' : this.hovered ? 'HOVER' : this.nearby ? 'NEARBY' : this.isLocal ? 'LOCAL' : null;
    this.ring.setVisible(style !== null && !this.hidden);
    if (style) this.ring.setTexture(ensureAvatarRingTexture(this.scene, style));
  }

  private renderLabel(): void {
    const { status } = this;
    const offline = status.presence === 'OFFLINE';
    const color = offline ? PRESENCE_META.OFFLINE.color : ACTIVITY_META[status.activity].color;
    const isLive = this.controller === 'REMOTE';
    this.label.render({
      name: firstNameOf(status.displayName),
      statusLine: isLive ? `Live · ${status.statusLine}` : status.statusLine,
      dotColor: hexToNumber(color),
      expanded: this.hovered || this.selected || this.nearby,
      isLocal: this.isLocal,
      isLive,
      dimmed: offline,
    });
  }
}
