import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { OfficeMemberDto, OfficeStateResponse } from '@virtual-office/shared';
import { AppConfig } from '../../config/configuration';
import { ActivityEngine } from '../activities/activity-engine.service';
import { AvatarProfilesService } from '../avatars/avatar-profiles.service';
import { AzureWorkService } from '../azure-devops/azure-work.service';
import { EmployeesService } from '../employees/employees.service';
import { PresenceService } from '../presence/presence.service';

/**
 * Everything the office needs for its first render in production, composed
 * from the database (employees, avatars, presence, synced Azure DevOps work)
 * and the Activity Engine. The floor plan geometry is static and lives with
 * the client renderer; members only carry their desk id.
 */
@Injectable()
export class OfficeStateService {
  private readonly organization: AppConfig['organization'];

  constructor(
    configService: ConfigService,
    private readonly employees: EmployeesService,
    private readonly avatars: AvatarProfilesService,
    private readonly presence: PresenceService,
    private readonly activity: ActivityEngine,
    private readonly work: AzureWorkService,
  ) {
    this.organization = configService.get<AppConfig>('app')!.organization;
  }

  async getState(): Promise<OfficeStateResponse> {
    const [employees, avatarProfiles, presenceById, work] = await Promise.all([
      this.employees.listActive(),
      this.avatars.listAll(),
      this.presence.listAll(),
      this.work.getSnapshot(),
    ]);
    const activeIds = new Set(employees.map((employee) => employee.id));

    const members: OfficeMemberDto[] = employees.map((employee) => ({
      id: employee.id,
      displayName: employee.displayName,
      email: employee.email,
      role: employee.role,
      jobTitle: employee.jobTitle,
      team: employee.team,
      discipline: employee.discipline,
      assignedDeskId: employee.assignedDeskId,
      presence: presenceById.get(employee.id) ?? this.presence.offline(),
      activity: this.activity.resolveForEmployee(employee.id),
    }));

    return {
      organization: { id: this.organization.id, name: this.organization.name },
      officeId: this.organization.officeId,
      floorId: this.organization.floorId,
      members,
      avatarProfiles: avatarProfiles.filter((profile) => activeIds.has(profile.employeeId)),
      // Teams / calendar meetings arrive with the Microsoft Graph phase.
      meetings: [],
      work,
    };
  }
}
