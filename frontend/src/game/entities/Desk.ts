import type { Desk as DeskDomain, UUID } from '@virtual-office/shared';
import Phaser from 'phaser';

import { chairAngleForDesk, deskBounds, deskSeat, normalizeAngle } from '@/game/maps/map-geometry';
import type { MapSpot } from '@/game/maps/office-map.types';
import { DEPTH } from '@/game/rendering/depth';
import { deskTextureKey, ensureFurnitureTexture, FURNITURE_CATALOG } from '@/game/rendering/furniture-textures';
import { renderScaleOf } from '@/game/rendering/render-scale';
import { ensurePillTexture, ensurePlateTexture, uiTextureScale } from '@/game/rendering/ui-textures';
import { WORLD_COLORS } from '@/game/rendering/world-palette';

export type DeskState = 'PRESENT' | 'AWAY' | 'OFFLINE' | 'FREE';

export interface DeskOwner {
  employeeId: UUID;
  displayName: string;
  accent: number;
}

const FONT = '"Inter Variable", Inter, system-ui, sans-serif';

/**
 * Rendering-side representation of a domain `Desk`: desk surface (screen
 * lit when the owner is seated), chair, owner nameplate and hover tooltip.
 */
export class DeskEntity {
  public readonly deskId: UUID;
  public readonly seat: MapSpot;
  public readonly owner: DeskOwner | null;
  public readonly surface: Phaser.GameObjects.Image;
  public state: DeskState = 'FREE';

  private readonly chair: Phaser.GameObjects.Image;
  private readonly highlight: Phaser.GameObjects.Graphics;
  private readonly nameplate: Phaser.GameObjects.Container | null;
  private readonly plate: { image: Phaser.GameObjects.Image; width: number } | null;
  private readonly tooltip: Phaser.GameObjects.Container;
  private readonly code: string;

  constructor(scene: Phaser.Scene, desk: DeskDomain, owner: DeskOwner | null, code: string) {
    this.deskId = desk.id;
    this.owner = owner;
    this.code = code;
    this.seat = deskSeat(desk);
    const { textureScale, textResolution } = renderScaleOf(scene);
    const bounds = deskBounds(desk);
    const angle = normalizeAngle(desk.rotation);

    this.surface = scene.add
      .image(desk.position.x, desk.position.y, deskTextureKey(false))
      .setScale(1 / textureScale)
      .setAngle(angle)
      .setDepth(bounds.y + bounds.height);

    const chairKey = ensureFurnitureTexture(scene, 'CHAIR', owner ? 'CHARCOAL' : 'SLATE');
    this.chair = scene.add
      .image(this.seat.x, this.seat.y + (this.seat.facing === 'up' ? 2 : -2), chairKey)
      .setScale(1 / textureScale)
      .setAngle(chairAngleForDesk(desk))
      .setDepth(this.seat.y - FURNITURE_CATALOG.CHAIR.height / 2);

    this.highlight = scene.add.graphics().setDepth(bounds.y + bounds.height + 0.1);
    this.highlight.lineStyle(2, WORLD_COLORS.accent, 1);
    this.highlight.strokeRoundedRect(bounds.x - 3, bounds.y - 3, bounds.width + 6, bounds.height + 6, 6);
    this.highlight.setVisible(false);

    // Nameplate on the chair-side edge of the desk, in the owner's accent color.
    const plateOffset = (angle === 180 ? -1 : 1) * (bounds.height / 2 - 4);
    if (owner) {
      const firstName = owner.displayName.split(' ')[0] ?? owner.displayName;
      const text = scene.add
        .text(0, 0, firstName, { fontFamily: FONT, fontSize: '7.5px', fontStyle: '700', color: '#1f2433', resolution: textResolution })
        .setOrigin(0.5);
      const width = Math.ceil(text.width + 10);
      const accentHex = `#${owner.accent.toString(16).padStart(6, '0')}`;
      const plate = scene.add.image(0, 0, ensurePlateTexture(scene, width, accentHex)).setScale(uiTextureScale(scene));
      text.setX(1.5);
      this.nameplate = scene.add.container(desk.position.x, desk.position.y + plateOffset, [plate, text]).setDepth(bounds.y + bounds.height + 0.05);
      this.plate = { image: plate, width };
    } else {
      this.nameplate = null;
      this.plate = null;
    }

    const tooltipText = scene.add
      .text(0, 0, '', { fontFamily: FONT, fontSize: '10px', fontStyle: '600', color: WORLD_COLORS.labelText, resolution: textResolution })
      .setOrigin(0.5);
    const tooltipBg = scene.add.image(0, 0, ensurePillTexture(scene, 'TOOLTIP', 40, 20)).setScale(uiTextureScale(scene));
    this.tooltip = scene.add
      .container(desk.position.x, bounds.y - 14, [tooltipBg, tooltipText])
      .setDepth(DEPTH.TOOLTIP)
      .setVisible(false);
    this.tooltip.setData('text', tooltipText);
    this.tooltip.setData('bg', tooltipBg);

    this.surface.setInteractive({ useHandCursor: true });
  }

  setState(state: DeskState): void {
    if (this.state === state) return;
    this.state = state;
    this.surface.setTexture(deskTextureKey(state === 'PRESENT'));
    this.nameplate?.setAlpha(state === 'OFFLINE' ? 0.55 : 1);
  }

  /** The owner's look changed: keep the nameplate in their top color. */
  setOwnerAccent(accent: number): void {
    if (!this.plate) return;
    this.plate.image.setTexture(ensurePlateTexture(this.surface.scene, this.plate.width, `#${accent.toString(16).padStart(6, '0')}`));
  }

  setHighlighted(highlighted: boolean): void {
    this.highlight.setVisible(highlighted);
  }

  showTooltip(visible: boolean): void {
    if (!visible) {
      this.tooltip.setVisible(false);
      return;
    }
    const text = this.tooltip.getData('text') as Phaser.GameObjects.Text;
    const bg = this.tooltip.getData('bg') as Phaser.GameObjects.Image;
    const stateLabel: Record<DeskState, string> = {
      PRESENT: 'at desk',
      AWAY: 'away from desk',
      OFFLINE: 'offline',
      FREE: 'hot desk · free',
    };
    text.setText(this.owner ? `${this.code} · ${this.owner.displayName} · ${stateLabel[this.state]}` : `${this.code} · ${stateLabel.FREE}`);
    bg.setTexture(ensurePillTexture(this.surface.scene, 'TOOLTIP', Math.ceil(text.width + 16), 20));
    this.tooltip.setVisible(true);
  }

  destroy(): void {
    this.surface.destroy();
    this.chair.destroy();
    this.highlight.destroy();
    this.nameplate?.destroy();
    this.tooltip.destroy();
  }
}
