import type { UUID } from '@virtual-office/shared';
import type Phaser from 'phaser';

import type { EmployeeStatusView } from '@/game/bridge/GameEvents';
import type { EmployeeAvatar } from '@/game/entities/EmployeeAvatar';

/**
 * Applies presence/activity status views (formatted by Vue) to avatars and
 * remembers the latest view per employee for desks and late spawns. Does not
 * own avatars — the registry is injected so EmployeeManager/PlayerManager stay owners.
 */
export class PresenceSystem {
  private readonly statusById = new Map<UUID, EmployeeStatusView>();

  constructor(
    protected readonly scene: Phaser.Scene,
    private readonly findAvatar: (employeeId: UUID) => EmployeeAvatar | undefined,
  ) {}

  apply(view: EmployeeStatusView): void {
    this.statusById.set(view.employeeId, view);
    this.findAvatar(view.employeeId)?.applyStatus(view);
  }

  statusOf(employeeId: UUID): EmployeeStatusView | undefined {
    return this.statusById.get(employeeId);
  }
}
