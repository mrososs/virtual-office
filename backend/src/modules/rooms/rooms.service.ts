import { Injectable } from '@nestjs/common';
import type { Room, RoomOccupancy, RoomType, UUID } from '@virtual-office/shared';
import { SupabaseService } from '../../common/supabase/supabase.service';

@Injectable()
export class RoomsService {
  constructor(private readonly supabaseService: SupabaseService) {}

  async findById(roomId: UUID): Promise<Room | null> {
    // TODO: query the `rooms` table.
    void roomId;
    return null;
  }

  async findByOffice(officeId: UUID): Promise<Room[]> {
    // TODO: query all rooms for an office.
    void officeId;
    return [];
  }

  async getOccupancy(roomId: UUID): Promise<RoomOccupancy | null> {
    // TODO: derive from current employee.room assignments (cache or query).
    void roomId;
    return null;
  }

  /**
   * Finds the best candidate room of a given type with free capacity.
   * Used both for ad-hoc "walk to a code review room" placement and by
   * `MeetingRoomAllocator` (which layers meeting-specific rules on top).
   */
  async findAvailableRoom(officeId: UUID, type: RoomType, requiredCapacity = 1): Promise<Room | null> {
    // TODO: query rooms of `type` in `officeId` whose occupancy + requiredCapacity <= capacity,
    // preferring the smallest room that still fits.
    void officeId;
    void type;
    void requiredCapacity;
    return null;
  }

  /** Marks a room as reserved (e.g. for an upcoming meeting) so it isn't double-booked. */
  async reserveRoom(roomId: UUID, meetingId?: UUID): Promise<void> {
    // TODO: set `rooms.is_reserved` / `active_meeting_id` and broadcast
    // SOCKET_EVENTS.ROOM_OCCUPANCY_CHANGED via RealtimeModule.
    void roomId;
    void meetingId;
  }

  /** Releases a previously reserved room, making it available again. */
  async releaseRoom(roomId: UUID): Promise<void> {
    // TODO: clear reservation flags and broadcast the occupancy change.
    void roomId;
  }
}
