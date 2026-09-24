import type { Desk, Room, RoomOccupancy, UUID, Vector2 } from '@virtual-office/shared';
import { defineStore } from 'pinia';

interface RoomStoreState {
  roomsById: Record<UUID, Room>;
  desksById: Record<UUID, Desk>;
  /** Derived from avatar positions reported by the game's RoomSystem — never hand-set. */
  occupancyByRoomId: Record<UUID, RoomOccupancy>;
}

export const useRoomStore = defineStore('room', {
  state: (): RoomStoreState => ({
    roomsById: {},
    desksById: {},
    occupancyByRoomId: {},
  }),

  getters: {
    all: (state): Room[] => Object.values(state.roomsById),
    byId:
      (state) =>
      (id: UUID): Room | undefined =>
        state.roomsById[id],
    deskById:
      (state) =>
      (id: UUID): Desk | undefined =>
        state.desksById[id],
    roomAt:
      (state) =>
      (point: Vector2): Room | undefined =>
        Object.values(state.roomsById).find(
          ({ bounds }) => point.x >= bounds.x && point.x <= bounds.x + bounds.width && point.y >= bounds.y && point.y <= bounds.y + bounds.height,
        ),
    occupantsOf:
      (state) =>
      (roomId: UUID): UUID[] =>
        state.occupancyByRoomId[roomId]?.employeeIds ?? [],
  },

  actions: {
    setLayout(rooms: Room[], desks: Desk[]): void {
      this.roomsById = Object.fromEntries(rooms.map((room) => [room.id, room]));
      this.desksById = Object.fromEntries(desks.map((desk) => [desk.id, desk]));
      this.occupancyByRoomId = Object.fromEntries(
        rooms.map((room) => [room.id, emptyOccupancy(room)]),
      );
    },

    moveEmployee(employeeId: UUID, fromRoomId: UUID | null, toRoomId: UUID | null): void {
      const now = new Date().toISOString();
      if (fromRoomId) {
        const from = this.occupancyByRoomId[fromRoomId];
        if (from) {
          from.employeeIds = from.employeeIds.filter((id) => id !== employeeId);
          from.count = from.employeeIds.length;
          from.updatedAt = now;
        }
      }
      if (toRoomId) {
        const to = this.occupancyByRoomId[toRoomId];
        if (to && !to.employeeIds.includes(employeeId)) {
          to.employeeIds = [...to.employeeIds, employeeId];
          to.count = to.employeeIds.length;
          to.updatedAt = now;
        }
      }
    },

    removeEmployeeEverywhere(employeeId: UUID): void {
      for (const occupancy of Object.values(this.occupancyByRoomId)) {
        if (occupancy.employeeIds.includes(employeeId)) {
          occupancy.employeeIds = occupancy.employeeIds.filter((id) => id !== employeeId);
          occupancy.count = occupancy.employeeIds.length;
        }
      }
    },
  },
});

function emptyOccupancy(room: Room): RoomOccupancy {
  return { roomId: room.id, employeeIds: [], count: 0, capacity: room.capacity, updatedAt: new Date().toISOString() };
}
