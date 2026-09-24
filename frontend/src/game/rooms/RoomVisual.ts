import type { Room, RoomType, UUID } from '@virtual-office/shared';
import Phaser from 'phaser';

import type { RoomMeetingView } from '@/game/bridge/GameEvents';
import { RoomEntity } from '@/game/entities/Room';
import type { RoomLayout } from '@/game/maps/office-map.types';
import { DEPTH } from '@/game/rendering/depth';
import { renderScaleOf } from '@/game/rendering/render-scale';
import { ensureDotTexture, ensurePillTexture, uiTextureScale } from '@/game/rendering/ui-textures';
import { WORLD_COLORS } from '@/game/rendering/world-palette';
import { ROOM_TYPE_META, hexToNumber } from '@/shared/constants/activity-meta';
import { formatCountdown, formatTimeRange } from '@/shared/utils/format';

const FONT = '"Inter Variable", Inter, system-ui, sans-serif';
const SIGN_WIDTH = 200;
const SIGN_HEIGHT = 42;

/**
 * Maps a domain `Room` (from @virtual-office/shared) to its Phaser-side
 * visuals: name chip with live occupancy, meeting sign, floor outline. The
 * ONLY place that turns `Room` fields into rendering concerns.
 */
export class RoomVisual {
  public readonly roomId: UUID;
  public readonly type: RoomType;
  public readonly room: Room;
  public readonly labelChip: Phaser.GameObjects.Container;
  public readonly sign: Phaser.GameObjects.Container | null;

  private readonly outline: RoomEntity;
  private readonly scene: Phaser.Scene;
  private readonly labelBg: Phaser.GameObjects.Image;
  private readonly labelDot: Phaser.GameObjects.Image;
  private readonly labelText: Phaser.GameObjects.Text;
  private readonly countText: Phaser.GameObjects.Text;
  private readonly signParts: {
    bg: Phaser.GameObjects.Image;
    status: Phaser.GameObjects.Text;
    statusDot: Phaser.GameObjects.Arc;
    title: Phaser.GameObjects.Text;
    time: Phaser.GameObjects.Text;
    count: Phaser.GameObjects.Text;
  } | null;
  private occupancy = 0;
  private meeting: RoomMeetingView | null = null;
  private selected = false;
  private hovered = false;

  constructor(scene: Phaser.Scene, room: Room, layout: RoomLayout | undefined) {
    this.scene = scene;
    this.room = room;
    this.roomId = room.id;
    this.type = room.type;
    const resolution = renderScaleOf(scene).textResolution;

    this.outline = new RoomEntity(scene, room.bounds);

    const anchor = layout?.label ?? { x: room.bounds.x + 12, y: room.bounds.y + 12 };
    const uiScale = uiTextureScale(scene);
    this.labelBg = scene.add.image(0, 0, ensurePillTexture(scene, 'CHIP', 40, 18)).setOrigin(0, 0).setScale(uiScale);
    this.labelDot = scene.add
      .image(9, 9, ensureDotTexture(scene))
      .setScale(uiScale * (6 / 7.2))
      .setTint(hexToNumber(ROOM_TYPE_META[room.type].color));
    this.labelText = scene.add
      .text(0, 0, room.name.toUpperCase(), { fontFamily: FONT, fontSize: '9.5px', fontStyle: '700', color: '#2b3142', resolution })
      .setLetterSpacing(0.6)
      .setOrigin(0, 0.5);
    this.countText = scene.add
      .text(0, 0, '', { fontFamily: FONT, fontSize: '9.5px', fontStyle: '600', color: '#6b7385', resolution })
      .setOrigin(0, 0.5);
    this.labelChip = scene.add.container(anchor.x, anchor.y, [this.labelBg, this.labelDot, this.labelText, this.countText]).setDepth(DEPTH.ROOM_LABEL);
    this.renderLabel();

    if (layout?.sign) {
      const bg = scene.add.image(0, 0, ensurePillTexture(scene, 'SIGN_LIVE', SIGN_WIDTH, SIGN_HEIGHT)).setScale(uiScale);
      const statusDot = scene.add.circle(-SIGN_WIDTH / 2 + 14, -8, 3.2, 0xef4444);
      const status = scene.add
        .text(-SIGN_WIDTH / 2 + 22, -8, '', { fontFamily: FONT, fontSize: '8.5px', fontStyle: '800', color: '#ef4444', resolution })
        .setLetterSpacing(0.8)
        .setOrigin(0, 0.5);
      const title = scene.add
        .text(-SIGN_WIDTH / 2 + 10, 8, '', { fontFamily: FONT, fontSize: '11px', fontStyle: '600', color: WORLD_COLORS.labelText, resolution })
        .setOrigin(0, 0.5);
      const time = scene.add
        .text(SIGN_WIDTH / 2 - 10, -8, '', { fontFamily: FONT, fontSize: '9px', fontStyle: '500', color: WORLD_COLORS.labelMuted, resolution })
        .setOrigin(1, 0.5);
      const count = scene.add
        .text(SIGN_WIDTH / 2 - 10, 8, '', { fontFamily: FONT, fontSize: '9.5px', fontStyle: '600', color: WORLD_COLORS.labelMuted, resolution })
        .setOrigin(1, 0.5);
      this.signParts = { bg, status, statusDot, title, time, count };
      this.sign = scene.add
        .container(layout.sign.x, layout.sign.y, [bg, statusDot, status, title, time, count])
        .setDepth(DEPTH.ROOM_SIGN)
        .setSize(SIGN_WIDTH, SIGN_HEIGHT)
        .setVisible(false);
      this.sign.setInteractive({ useHandCursor: true });
    } else {
      this.sign = null;
      this.signParts = null;
    }

    this.labelChip.setInteractive({
      hitArea: new Phaser.Geom.Rectangle(this.labelChip.width / 2, 9, this.labelChip.width, 18),
      hitAreaCallback: Phaser.Geom.Rectangle.Contains,
      useHandCursor: true,
    });
  }

  get currentMeeting(): RoomMeetingView | null {
    return this.meeting;
  }

  setOccupancy(count: number): void {
    if (this.occupancy === count) return;
    this.occupancy = count;
    this.renderLabel();
    this.renderSign();
  }

  setMeeting(meeting: RoomMeetingView | null): void {
    this.meeting = meeting;
    this.renderSign();
    this.renderOutline();
  }

  setSelected(selected: boolean): void {
    this.selected = selected;
    this.renderOutline();
    this.renderLabel();
  }

  setHovered(hovered: boolean): void {
    if (this.hovered === hovered) return;
    this.hovered = hovered;
    this.renderLabel();
  }

  /** Called ~once per second for countdowns and the live pulse. */
  tick(now: number): void {
    if (this.meeting?.status === 'STARTING_SOON') this.renderSign(now);
    if (this.meeting?.status === 'LIVE' && !this.selected) {
      this.outline.setPulseAlpha(0.65 + 0.35 * Math.sin(now / 420));
      this.signParts?.statusDot.setAlpha(0.55 + 0.45 * Math.sin(now / 260));
    }
  }

  destroy(): void {
    this.outline.destroy();
    this.labelChip.destroy();
    this.sign?.destroy();
  }

  private renderOutline(): void {
    this.outline.setPulseAlpha(1);
    this.outline.setHighlight(this.selected ? 'SELECTED' : this.meeting?.status === 'LIVE' ? 'LIVE' : 'NONE');
  }

  private renderLabel(): void {
    this.countText.setText(this.occupancy > 0 ? `${this.occupancy}/${this.room.capacity}` : '');
    const gap = this.occupancy > 0 ? 6 : 0;
    const width = Math.ceil(16 + this.labelText.width + gap + this.countText.width + 8);
    this.labelBg.setTexture(ensurePillTexture(this.scene, this.selected ? 'CHIP_SELECTED' : this.hovered ? 'CHIP_HOVER' : 'CHIP', width, 18));
    this.labelText.setPosition(16, 9.5);
    this.countText.setPosition(16 + this.labelText.width + gap, 9.5);
    // Containers hit-test relative to their center (displayOrigin = size / 2), and the chip is drawn from its left edge.
    this.labelChip.setSize(width, 18);
    const hitArea = this.labelChip.input?.hitArea as Phaser.Geom.Rectangle | undefined;
    hitArea?.setTo(width / 2, 9, width, 18);
  }

  private renderSign(now: number = Date.now()): void {
    if (!this.sign || !this.signParts) return;
    const meeting = this.meeting;
    if (!meeting || (meeting.status !== 'LIVE' && meeting.status !== 'STARTING_SOON')) {
      this.sign.setVisible(false);
      return;
    }
    const live = meeting.status === 'LIVE';
    const color = live ? 0xef4444 : 0xf59e0b;
    const colorHex = live ? '#f87171' : '#fbbf24';
    const { bg, status, statusDot, title, time, count } = this.signParts;

    bg.setTexture(ensurePillTexture(this.scene, live ? 'SIGN_LIVE' : 'SIGN_SOON', SIGN_WIDTH, SIGN_HEIGHT));

    statusDot.setFillStyle(color, 1);
    status.setColor(colorHex).setText(live ? 'LIVE' : `STARTS ${formatCountdown(meeting.startAt, now).toUpperCase()}`);
    time.setText(formatTimeRange(meeting.startAt, meeting.endAt));
    count.setText(`${this.occupancy}/${this.room.capacity} here`);
    fitText(title, meeting.title, SIGN_WIDTH - 30 - count.width);
    this.sign.setVisible(true);
  }
}

/** Truncates `value` with an ellipsis until the rendered text fits `maxWidth`. */
function fitText(text: Phaser.GameObjects.Text, value: string, maxWidth: number): void {
  text.setText(value);
  let length = value.length;
  while (text.width > maxWidth && length > 4) {
    length -= 1;
    text.setText(`${value.slice(0, length).trimEnd()}…`);
  }
}
