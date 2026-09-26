import {
  normalizeAvatarAppearance,
  type AvatarAppearance,
  type AvatarProfile,
  type Employee,
  type EmployeeActivity,
  type EmployeeMeetingRef,
  type EmployeePresence,
  type EmployeeRoom,
  type UUID,
} from '@virtual-office/shared';
import { defineStore } from 'pinia';

interface EmployeeStoreState {
  employeesById: Record<UUID, Employee>;
  /** Everyone's saved avatar, keyed by employee. Missing = not created yet (rendered with the default look). */
  avatarProfilesById: Record<UUID, AvatarProfile>;
}

/**
 * Vue-side source of truth for employee domain data (presence, activity,
 * meeting, current room) and each person's avatar profile. Positions are NOT
 * mirrored here every frame — Phaser owns live coordinates and only reports
 * room transitions.
 */
export const useEmployeeStore = defineStore('employee', {
  state: (): EmployeeStoreState => ({
    employeesById: {},
    avatarProfilesById: {},
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
    avatarProfileOf:
      (state) =>
      (id: UUID): AvatarProfile | undefined =>
        state.avatarProfilesById[id],
    /** Always renderable: invalid or missing cosmetics fall back to defaults. */
    appearanceOf:
      (state) =>
      (id: UUID): AvatarAppearance =>
        normalizeAvatarAppearance(state.avatarProfilesById[id]),
  },

  actions: {
    setEmployees(employees: Employee[]): void {
      this.employeesById = Object.fromEntries(employees.map((employee) => [employee.id, employee]));
    },

    setAvatarProfiles(profiles: AvatarProfile[]): void {
      this.avatarProfilesById = Object.fromEntries(profiles.map((profile) => [profile.employeeId, profile]));
    },

    upsertAvatarProfile(profile: AvatarProfile): void {
      this.avatarProfilesById[profile.employeeId] = profile;
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
