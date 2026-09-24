import type { RoomMeetingState } from '@/game/bridge/GameEvents';

import type { RoomManager } from './RoomManager';

const TICK_INTERVAL_MS = 250;

/**
 * Shows meeting lifecycle state on meeting rooms (sign, LIVE pulse,
 * countdown). Meeting data arrives from Vue via SET_ROOM_MEETING; this
 * manager never talks to sockets or calendars.
 */
export class MeetingRoomManager {
  private elapsedMs = 0;

  constructor(private readonly roomManager: RoomManager) {}

  apply(state: RoomMeetingState): void {
    this.roomManager.findById(state.roomId)?.setMeeting(state.meeting);
  }

  applyAll(states: RoomMeetingState[]): void {
    for (const state of states) this.apply(state);
  }

  update(deltaMs: number): void {
    this.elapsedMs += deltaMs;
    if (this.elapsedMs < TICK_INTERVAL_MS) return;
    this.elapsedMs = 0;
    this.roomManager.tick(Date.now());
  }
}
