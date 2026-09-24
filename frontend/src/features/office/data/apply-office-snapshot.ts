import type { OfficeSnapshot } from '@/features/office/data/office-data-source';
import { useEmployeeStore } from '@/stores/employee.store';
import { useFeedStore } from '@/stores/feed.store';
import { useMeetingStore } from '@/stores/meeting.store';
import { useOfficeStore } from '@/stores/office.store';
import { useRoomStore } from '@/stores/room.store';
import { useWorkStore } from '@/stores/work.store';

/** Loads a full snapshot into the stores (first load). */
export function applyOfficeSnapshot(snapshot: OfficeSnapshot): void {
  useOfficeStore().setOffice({
    organizationName: snapshot.organizationName,
    office: snapshot.office,
    floor: snapshot.floor,
    teams: snapshot.teams,
    map: snapshot.map,
  });
  useRoomStore().setLayout(snapshot.rooms, snapshot.desks);
  applyDynamicState(snapshot);
  useFeedStore().setItems(snapshot.feed);
}

/**
 * Replaces only the fast-changing domain state (people, meetings, work),
 * keeping layout and where avatars currently stand. Used by demo resets.
 */
export function applyDynamicState(snapshot: Pick<OfficeSnapshot, 'employees' | 'avatarAppearances' | 'meetings' | 'workItems' | 'pullRequests' | 'builds' | 'sprint'>): void {
  const employeeStore = useEmployeeStore();
  const currentRooms = new Map(Object.values(employeeStore.employeesById).map((employee) => [employee.id, employee.room]));
  employeeStore.setEmployees(
    snapshot.employees.map((employee) => ({ ...employee, room: currentRooms.get(employee.id) ?? employee.room })),
    snapshot.avatarAppearances,
  );
  useMeetingStore().setMeetings(snapshot.meetings);
  useWorkStore().setAll({
    workItems: snapshot.workItems,
    pullRequests: snapshot.pullRequests,
    builds: snapshot.builds,
    sprint: snapshot.sprint,
  });
}
