import type { Desk, Employee, OfficeMemberDto, OfficeStateResponse } from '@virtual-office/shared';

import { createHqFloorPlan } from '@/features/office/layout/hq-floor-plan';

import type { OfficeSnapshot } from './office-data-source';

/**
 * API office state + the static HQ floor plan → the snapshot the stores and
 * Phaser already understand. The API sends desk *ids*; coordinates come from
 * the same floor plan the renderer draws, so they can never disagree.
 */
export function composeOfficeSnapshot(state: OfficeStateResponse): OfficeSnapshot {
  const plan = createHqFloorPlan({ organizationId: state.organization.id, officeId: state.officeId, floorId: state.floorId });
  const deskById = new Map(plan.desks.map((desk) => [desk.id, desk]));
  const ownerByDesk = new Map(
    state.members.filter((member) => member.assignedDeskId && deskById.has(member.assignedDeskId)).map((member) => [member.assignedDeskId as string, member.id]),
  );
  const desks: Desk[] = plan.desks.map((desk) => ({ ...desk, employeeId: ownerByDesk.get(desk.id) ?? null }));

  return {
    organizationName: state.organization.name,
    office: plan.office,
    floor: plan.floor,
    map: plan.map,
    rooms: plan.rooms,
    desks,
    employees: state.members.map((member) => toEmployee(member, state.organization.id, member.assignedDeskId ? deskById.get(member.assignedDeskId) : undefined)),
    avatarProfiles: state.avatarProfiles,
    meetings: state.meetings,
    workItems: state.work.workItems,
    pullRequests: state.work.pullRequests,
    builds: state.work.builds,
    sprint: state.work.sprint,
    feed: [],
  };
}

function toEmployee(member: OfficeMemberDto, organizationId: string, desk: Desk | undefined): Employee {
  return {
    id: member.id,
    organizationId,
    displayName: member.displayName,
    email: member.email,
    role: member.role,
    jobTitle: member.jobTitle,
    team: member.team,
    discipline: member.discipline,
    position: desk ? { x: desk.position.x, y: desk.position.y, direction: 'down' } : { x: 0, y: 0, direction: 'down' },
    assignedDesk: desk ? { deskId: desk.id, x: desk.position.x, y: desk.position.y } : null,
    presence: member.presence,
    activity: member.activity,
    room: { roomId: null, roomType: null },
    meeting: null,
  };
}
