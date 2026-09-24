import Phaser from 'phaser';

import { DEPTH } from '@/game/rendering/depth';
import { renderScaleOf } from '@/game/rendering/render-scale';
import { ensureDotRingTexture, ensureDotTexture, ensurePillTexture, uiTextureScale, type PillStyle } from '@/game/rendering/ui-textures';
import { WORLD_COLORS } from '@/game/rendering/world-palette';

const FONT = '"Inter Variable", Inter, system-ui, sans-serif';
const PADDING_X = 7;
const DOT_RADIUS = 3;

export interface AvatarLabelContent {
  name: string;
  statusLine: string;
  dotColor: number;
  expanded: boolean;
  isLocal: boolean;
  isLive: boolean;
  dimmed: boolean;
}

/**
 * Compact name pill above an avatar; expands to show the status line on
 * hover/selection/proximity. Backgrounds are cached textures (see
 * ui-textures) — never per-frame vector graphics.
 */
export class AvatarLabel extends Phaser.GameObjects.Container {
  private readonly background: Phaser.GameObjects.Image;
  private readonly dot: Phaser.GameObjects.Image;
  private readonly liveRing: Phaser.GameObjects.Image;
  private readonly nameText: Phaser.GameObjects.Text;
  private readonly youText: Phaser.GameObjects.Text;
  private readonly statusText: Phaser.GameObjects.Text;
  private signature = '';

  constructor(scene: Phaser.Scene) {
    super(scene, 0, 0);
    const resolution = renderScaleOf(scene).textResolution;
    const scale = uiTextureScale(scene);
    this.background = scene.add.image(0, 0, ensurePillTexture(scene, 'LABEL', 40, 18)).setOrigin(0.5, 1).setScale(scale);
    this.dot = scene.add.image(0, 0, ensureDotTexture(scene)).setScale(scale * ((DOT_RADIUS * 2) / 7.2));
    this.liveRing = scene.add.image(0, 0, ensureDotRingTexture(scene)).setScale(scale).setTint(0x22c55e).setAlpha(0.7);
    this.nameText = scene.add.text(0, 0, '', { fontFamily: FONT, fontSize: '10.5px', fontStyle: '600', color: WORLD_COLORS.labelText, resolution });
    this.youText = scene.add.text(0, 0, 'You', { fontFamily: FONT, fontSize: '9px', fontStyle: '700', color: WORLD_COLORS.accentHex, resolution });
    this.statusText = scene.add.text(0, 0, '', { fontFamily: FONT, fontSize: '9.5px', fontStyle: '500', color: WORLD_COLORS.labelMuted, resolution });
    this.add([this.background, this.dot, this.liveRing, this.nameText, this.youText, this.statusText]);
    this.setDepth(DEPTH.AVATAR_LABEL);
    scene.add.existing(this);
  }

  render(content: AvatarLabelContent): void {
    const signature = JSON.stringify(content);
    if (signature === this.signature) return;
    this.signature = signature;

    this.nameText.setText(content.name).setAlpha(content.dimmed ? 0.7 : 1);
    this.youText.setVisible(content.isLocal);
    const showStatus = content.expanded && content.statusLine.length > 0;
    this.statusText.setVisible(showStatus).setText(showStatus ? content.statusLine : '');

    const nameWidth = this.nameText.width + (content.isLocal ? this.youText.width + 5 : 0);
    const firstLineWidth = DOT_RADIUS * 2 + 5 + nameWidth;
    const width = Math.ceil(Math.max(firstLineWidth, showStatus ? this.statusText.width : 0) + PADDING_X * 2);
    const height = showStatus ? 31 : 18;
    const left = -width / 2;
    const top = -height;

    const style: PillStyle = content.isLocal ? 'LABEL_LOCAL' : content.isLive ? 'LABEL_LIVE' : content.dimmed ? 'LABEL_DIMMED' : 'LABEL';
    this.background.setTexture(ensurePillTexture(this.scene, style, width, height));

    const lineCenter = top + 9;
    const dotX = left + PADDING_X + DOT_RADIUS;
    this.dot.setPosition(dotX, lineCenter).setTint(content.dotColor);
    this.liveRing.setPosition(dotX, lineCenter).setVisible(content.isLive);

    const nameX = left + PADDING_X + DOT_RADIUS * 2 + 5;
    this.nameText.setOrigin(0, 0.5).setPosition(nameX, lineCenter);
    this.youText.setOrigin(0, 0.5).setPosition(nameX + this.nameText.width + 5, lineCenter);
    this.statusText.setOrigin(0.5, 0.5).setPosition(0, top + 22.5);
  }
}
