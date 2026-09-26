import { SOCKET_EVENTS, type AvatarProfile, type PlayerAvatarUpdatedPayload, type UUID } from '@virtual-office/shared';

import type { OfficeSocket } from './OfficeSocket';

export interface AvatarSyncHandlers {
  onRemoteAvatar(employeeId: UUID, avatar: AvatarProfile): void;
}

/**
 * Avatar appearance traffic, kept apart from movement: the local player's
 * look is published only when it is saved, and teammates' changes arrive as
 * `player:avatar_updated`. Movement packets never carry appearance.
 */
export class AvatarSync {
  constructor(
    private readonly officeSocket: OfficeSocket,
    private readonly localEmployeeId: UUID,
    private readonly handlers: AvatarSyncHandlers,
  ) {}

  start(): void {
    this.officeSocket.on(SOCKET_EVENTS.PLAYER_AVATAR_UPDATED, this.handleUpdated);
  }

  stop(): void {
    this.officeSocket.off(SOCKET_EVENTS.PLAYER_AVATAR_UPDATED, this.handleUpdated);
  }

  publish(avatar: AvatarProfile): void {
    this.officeSocket.emit(SOCKET_EVENTS.PLAYER_AVATAR_UPDATE, { employeeId: this.localEmployeeId, avatar });
  }

  private handleUpdated = (payload: PlayerAvatarUpdatedPayload): void => {
    if (payload.employeeId === this.localEmployeeId || !payload.avatar) return;
    this.handlers.onRemoteAvatar(payload.employeeId, payload.avatar);
  };
}
