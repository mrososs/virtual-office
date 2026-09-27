import { checkExternalInvite, findGameProvider } from '@virtual-office/shared';

import { useGameStore } from '@/stores/game.store';

import { gameRoomClient } from '../game-room.client';

/** If the server never answers (connection hiccup), unlock the buttons again after this long. */
const PENDING_TIMEOUT_MS = 6000;

/**
 * What the Game Room UI can ask for. Only intent is sent — the server decides
 * who you are, whether there's room, and whether a link is acceptable.
 */
export function useGameRoomActions() {
  const gameStore = useGameStore();

  function pending(stationId: string): void {
    gameStore.pendingStationId = stationId;
    window.setTimeout(() => {
      if (gameStore.pendingStationId === stationId) gameStore.pendingStationId = null;
    }, PENDING_TIMEOUT_MS);
  }

  function join(stationId: string): void {
    if (gameStore.pendingStationId) return;
    if (gameRoomClient.joinTable(stationId)) pending(stationId);
  }

  /** Leave the table (and end the game session there). The UI closes right away; the server confirms to every tab. */
  function leave(stationId: string): void {
    gameRoomClient.leaveTable(stationId);
    gameStore.setSession(null);
  }

  /**
   * Host of an external game: share the room link / code. Checked here with the
   * same rules for instant feedback; the server repeats the check and decides.
   */
  function shareRoom(stationId: string, providerId: string, invite: string): void {
    const provider = findGameProvider(providerId);
    if (!provider) return;
    const check = checkExternalInvite(provider, invite);
    if (!check.ok) {
      gameStore.inviteError = check.reason;
      return;
    }
    gameStore.inviteError = null;
    if (gameRoomClient.shareRoom(stationId, invite.trim())) pending(stationId);
  }

  /**
   * Opens a provider page in a new tab, with no opener and no referrer, so
   * the game site learns nothing about the office. Only ever called with a
   * provider start page from the catalog or a link the server validated.
   */
  function openExternal(url: string): void {
    window.open(url, '_blank', 'noopener,noreferrer');
  }

  /** Internal Pong: Start (match found) or Rematch (match over). */
  function ready(sessionId: string): void {
    gameRoomClient.ready(sessionId);
  }

  /** Close an ended session's summary (internal Pong: "Wait for opponent" after an opponent left). */
  function dismissResult(): void {
    gameStore.setSession(null);
  }

  return { join, leave, shareRoom, openExternal, ready, dismissResult };
}
