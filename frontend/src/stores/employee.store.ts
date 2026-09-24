import type {
  Employee,
  EmployeeActivity,
  EmployeeMeetingRef,
  EmployeePresence,
  EmployeeRoom,
  UUID,
} from '@virtual-office/shared';
import { defineStore } from 'pinia';

import { resolveAvatarAppearance, type AvatarAppearance } from '@/shared/utils/avatar-appearance';

interface EmployeeStoreState {
  employeesById: Record<UUID, Employee>;
  appearanceOverrides: Record<UUID, Partial<AvatarAppearance>>;
}

/**
 * Vue-side source of truth for employee domain data (presence, activity,
 * meeting, current room). Positions are NOT mirrored here every frame —
 * Phaser owns live coordinates and only reports room transitions.
 */
export const useEmployeeStore = defineStore('employee', {
  state: (): EmployeeStoreState => ({
    employeesById: {},
    appearanceOverrides: {},
  }),

  getters: {
    all: (state): Employee[] =>
      Object.values(state.employeesById).sort((a, b) => a.displayName.localeCompare(b.displayName)),
    byId:
      (state) =>
      (id: UUID): Employee | undefined =>
        state.employeesById[id],
    onlineCount: (state): number =>
      Object.values(state.employeesById).filter((employee) => employee.presence.status !== 'OFFLINE').length,
    appearanceOf:
      (state) =>
      (id: UUID): AvatarAppearance =>
        resolveAvatarAppearance(id, state.appearanceOverrides[id]),
  },

  actions: {
    setEmployees(employees: Employee[], appearanceOverrides: Record<UUID, Partial<AvatarAppearance>> = {}): void {
      this.employeesById = Object.fromEntries(employees.map((employee) => [employee.id, employee]));
      this.appearanceOverrides = appearanceOverrides;
    },

    setActivity(employeeId: UUID, activity: EmployeeActivity, meeting: EmployeeMeetingRef | null = null): void {
      const employee = this.employeesById[employeeId];
      if (!employee) return;
      employee.activity = activity;
      employee.meeting = meeting;
    },

    setPresence(employeeId: UUID, presence: EmployeePresence): void {
      const employee = this.employeesById[employeeId];
      if (employee) employee.presence = presence;
    },

    setRoom(employeeId: UUID, room: EmployeeRoom): void {
      const employee = this.employeesById[employeeId];
      if (employee) employee.room = room;
    },
  },
});
