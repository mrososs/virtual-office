import { Injectable } from '@nestjs/common';
import type { MeetingParticipant, MeetingResponseStatus } from '@virtual-office/shared';
import { EmployeesService } from '../employees/employees.service';

/** Minimal shape of an external calendar attendee, independent of provider. */
export interface ExternalAttendee {
  email: string;
  displayName: string;
  responseStatus: MeetingResponseStatus;
  isOrganizer: boolean;
}

/**
 * Maps external calendar attendees (Microsoft Graph event attendees, Azure
 * DevOps notifications, etc.) to internal `MeetingParticipant` records by
 * matching email address to a known `Employee`. Attendees with no matching
 * employee (external guests, distribution lists) still map to a
 * `MeetingParticipant` with `employeeId: null`.
 */
@Injectable()
export class MeetingParticipantMapper {
  constructor(private readonly employeesService: EmployeesService) {}

  async mapAttendee(organizationId: string, attendee: ExternalAttendee): Promise<MeetingParticipant> {
    // TODO: look up an employee by email within the organization once
    // EmployeesService is backed by Supabase (e.g. findByEmail).
    void organizationId;
    void this.employeesService;

    return {
      employeeId: null,
      externalEmail: attendee.email,
      displayName: attendee.displayName,
      responseStatus: attendee.responseStatus,
      isOrganizer: attendee.isOrganizer,
    };
  }

  async mapAttendees(organizationId: string, attendees: ExternalAttendee[]): Promise<MeetingParticipant[]> {
    return Promise.all(attendees.map((attendee) => this.mapAttendee(organizationId, attendee)));
  }
}
