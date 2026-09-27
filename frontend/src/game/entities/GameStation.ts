import type { Bounds, Vector2 } from '@virtual-office/shared';
import Phaser from 'phaser';

import type { GameStationTone, GameStationView } from '@/game/bridge/GameEvents';
import type { MapSpot } from '@/game/maps/office-map.types';
import { DEPTH } from '@/game/rendering/depth';
import { renderScaleOf } from '@/game/rendering/render-scale';
import { ensureDotTexture, ensurePillTexture, uiTextureScale } from '@/game/rendering/ui-textures';
import { WORLD_COLORS } from '@/game/rendering/world-palette';

const FONT = '"Inter Variable", Inter, system-ui, sans-serif';
const CHIP_HEIGHT = 18;
const CHIP_GAP = 8;

const TONE_COLOR: Record<GameStationTone, number> = {
  free: 0x22c55e,
  waiting: 0xf59e0b,
  busy: 0x7c83ff,
};

/**
 * A game station in the world (the ping pong table): its footprint, where
 * players stand, and a small status chip above it ("PING PONG · Available").
 * The chip is the only thing drawn here — the table itself is furniture.
 */
export class GameStationEntity {
  public readonly stationId: string;
  public readonly bounds: Bounds;
  public readonly playerSpots: MapSpot[];
  public readonly chip: Phaser.GameObjects.Container;

  private readonly scene: Phaser.Scene;
  private readonly background: Phaser.GameObjects.Image;
  private readonly dot: Phaser.GameObjects.Image;
  private readonly titleText: Phaser.GameObjects.Text;
  private readonly detailText: Phaser.GameObjects.Text;
  private hovered = false;

  constructor(scene: Phaser.Scene, stationId: string, bounds: Bounds, playerSpots: MapSpot[]) {
    this.scene = scene;
    this.stationId = stationId;
    this.bounds = bounds;
    this.playerSpots = playerSpots;
    const resolution = renderScaleOf(scene).textResolution;
    const scale = uiTextureScale(scene);

    this.background = scene.add.image(0, 0, ensurePillTexture(scene, 'LABEL', 60, CHIP_HEIGHT)).setOrigin(0.5, 0.5).setScale(scale);
    this.dot = scene.add.image(0, 0, ensureDotTexture(scene)).setScale(scale * (6 / 7.2));
    this.titleText = scene.add
      .text(0, 0, '', { fontFamily: FONT, fontSize: '9px', fontStyle: '700', color: WORLD_COLORS.labelText, resolution })
      .setLetterSpacing(0.6)
      .setOrigin(0, 0.5);
    this.detailText = scene.add
      .text(0, 0, '', { fontFamily: FONT, fontSize: '9.5px', fontStyle: '500', color: WORLD_COLORS.labelMuted, resolution })
      .setOrigin(0, 0.5);
    // Below the table: players stand at its ends, and their name labels float above their heads.
    this.chip = scene.add
      .container(bounds.x + bounds.width / 2, bounds.y + bounds.height + CHIP_GAP + CHIP_HEIGHT / 2, [this.background, this.dot, this.titleText, this.detailText])
      .setDepth(DEPTH.ROOM_LABEL);
    this.render({ stationId, title: 'GAME', detail: 'Offline', tone: 'free' });
    this.chip.on('pointerover', () => this.setHovered(true));
    this.chip.on('pointerout', () => this.setHovered(false));
  }

  get center(): Vector2 {
    return { x: this.bounds.x + this.bounds.width / 2, y: this.bounds.y + this.bounds.height / 2 };
  }

  /** Distance from a point to the station's footprint (0 when on or over it). */
  distanceTo(point: Vector2): number {
    const dx = Math.max(this.bounds.x - point.x, 0, point.x - (this.bounds.x + this.bounds.width));
    const dy = Math.max(this.bounds.y - point.y, 0, point.y - (this.bounds.y + this.bounds.height));
    return Math.hypot(dx, dy);
  }

  render(view: GameStationView): void {
    this.titleText.setText(view.title.toUpperCase());
    this.detailText.setText(view.detail);
    this.dot.setTint(TONE_COLOR[view.tone]);
    const width = Math.ceil(8 + 6 + 5 + this.titleText.width + 6 + this.detailText.width + 8);
    this.background.setTexture(ensurePillTexture(this.scene, this.hovered ? 'LABEL_LOCAL' : 'LABEL', width, CHIP_HEIGHT));
    const left = -width / 2;
    this.dot.setPosition(left + 8 + 3, 0);
    this.titleText.setPosition(left + 8 + 6 + 5, 0.5);
    this.detailText.setPosition(left + 8 + 6 + 5 + this.titleText.width + 6, 0.5);
    this.chip.setSize(width, CHIP_HEIGHT);
    if (!this.chip.input) this.chip.setInteractive({ useHandCursor: true });
    else (this.chip.input.hitArea as Phaser.Geom.Rectangle).setTo(0, 0, width, CHIP_HEIGHT);
  }

  destroy(): void {
    this.chip.destroy();
  }

  private setHovered(hovered: boolean): void {
    if (this.hovered === hovered) return;
    this.hovered = hovered;
    const width = Math.ceil(this.chip.width);
    this.background.setTexture(ensurePillTexture(this.scene, hovered ? 'LABEL_LOCAL' : 'LABEL', width, CHIP_HEIGHT));
  }
}
