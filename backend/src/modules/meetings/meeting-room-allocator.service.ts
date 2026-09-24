import { Injectable, Logger } from '@nestjs/common';
import type { Room, UUID } from '@virtual-office/shared';
import { RoomsService } from '../rooms/rooms.service';

/**
 * Assigns a physical (virtual-office) room to a scheduled meeting. Separate
 * from `RoomsService` because allocation carries meeting-specific policy
 * (attendee-count fit, release-on-end) on top of the generic room CRUD/
 * reservation primitives `RoomsService` exposes.
 */
@Injectable()
export class MeetingRoomAllocator {
  private readonly logger = new Logger(MeetingRoomAllocator.name);

  constructor(private readonly roomsService: RoomsService) {}

  /**
   * Prefers the smallest MEETING-type room whose capacity still fits
   * `attendeeCount` — avoids parking a 2-person sync in the largest room.
   */
  async findAvailableRoom(officeId: UUID, attendeeCount: number): Promise<Room | null> {
    // TODO: replace with a real query once RoomsService is backed by Supabase:
    // fetch all MEETING rooms for the office, filter by (capacity >= attendeeCount
    // && not reserved), sort ascending by capacity, return the first.
    return this.roomsService.findAvailableRoom(officeId, 'MEETING', attendeeCount);
  }

  async reserveRoom(roomId: UUID, meetingId: UUID): Promise<void> {
    await this.roomsService.reserveRoom(roomId, meetingId);
    this.logger.debug(`Reserved room ${roomId} for meeting ${meetingId}`);
  }

  async releaseRoom(roomId: UUID): Promise<void> {
    await this.roomsService.releaseRoom(roomId);
    this.logger.debug(`Released room ${roomId}`);
  }

  /**
   * Convenience wrapper: find + reserve in one call, used by
   * `MeetingSchedulerService` when a meeting is about to start.
   */
  async assignAttendees(officeId: UUID, meetingId: UUID, attendeeCount: number): Promise<Room | null> {
    const room = await this.findAvailableRoom(officeId, attendeeCount);
    if (!room) {
      this.logger.warn(`No available meeting room fits ${attendeeCount} attendees in office ${officeId}`);
      return null;
    }
    await this.reserveRoom(room.id, meetingId);
    return room;
  }
}
