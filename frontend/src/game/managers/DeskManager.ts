import type { Desk, UUID } from '@virtual-office/shared';
import type Phaser from 'phaser';

import type { EmployeeStatusView } from '@/game/bridge/GameEvents';
import { DeskEntity, type DeskOwner, type DeskState } from '@/game/entities/Desk';
import type { EmployeeAvatar } from '@/game/entities/EmployeeAvatar';
import { distance } from '@/game/maps/map-geometry';
import type { MapSpot } from '@/game/maps/office-map.types';
import { deskCode } from '@/shared/utils/desk-code';

const SEATED_RADIUS = 10;
const REFRESH_INTERVAL_MS = 300;

/** Owns desk entities and keeps their visual state in sync with where owners actually are. */
export class DeskManager {
  private readonly desks = new Map<UUID, DeskEntity>();
  private selectedDeskId: UUID | null = null;
  private elapsedMs = REFRESH_INTERVAL_MS;

  constructor(private readonly scene: Phaser.Scene) {}

  load(desks: Desk[], ownersById: Map<UUID, DeskOwner>): DeskEntity[] {
    this.clear();
    for (const desk of desks) {
      const owner = desk.employeeId ? (ownersById.get(desk.employeeId) ?? null) : null;
      this.desks.set(desk.id, new DeskEntity(this.scene, desk, owner, deskCode(desk.id)));
    }
    return this.all();
  }

  all(): DeskEntity[] {
    return [...this.desks.values()];
  }

  seatOf(deskId: UUID): MapSpot | undefined {
    return this.desks.get(deskId)?.seat;
  }

  labelFor(desk: DeskEntity): string {
    return desk.owner ? `Desk ${deskCode(desk.deskId)} · ${desk.owner.displayName}` : `Desk ${deskCode(desk.deskId)}`;
  }

  setOwnerAccent(employeeId: UUID, accent: number): void {
    for (const desk of this.desks.values()) if (desk.owner?.employeeId === employeeId) desk.setOwnerAccent(accent);
  }

  setSelected(deskId: UUID | null): void {
    if (this.selectedDeskId === deskId) return;
    if (this.selectedDeskId) this.desks.get(this.selectedDeskId)?.setHighlighted(false);
    this.selectedDeskId = deskId;
    if (deskId) this.desks.get(deskId)?.setHighlighted(true);
  }

  update(
    deltaMs: number,
    findAvatar: (employeeId: UUID) => EmployeeAvatar | undefined,
    statusOf: (employeeId: UUID) => EmployeeStatusView | undefined,
  ): void {
    this.elapsedMs += deltaMs;
    if (this.elapsedMs < REFRESH_INTERVAL_MS) return;
    this.elapsedMs = 0;

    for (const desk of this.desks.values()) {
      desk.setState(this.resolveState(desk, findAvatar, statusOf));
    }
  }

  clear(): void {
    for (const desk of this.desks.values()) desk.destroy();
    this.desks.clear();
  }

  private resolveState(
    desk: DeskEntity,
    findAvatar: (employeeId: UUID) => EmployeeAvatar | undefined,
    statusOf: (employeeId: UUID) => EmployeeStatusView | undefined,
  ): DeskState {
    if (!desk.owner) return 'FREE';
    const status = statusOf(desk.owner.employeeId);
    if (status?.presence === 'OFFLINE') return 'OFFLINE';
    const avatar = findAvatar(desk.owner.employeeId);
    if (avatar && !avatar.isHidden && !avatar.isMoving && distance(avatar.position, desk.seat) <= SEATED_RADIUS) return 'PRESENT';
    return 'AWAY';
  }
}
