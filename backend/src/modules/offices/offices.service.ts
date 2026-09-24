import { Injectable } from '@nestjs/common';
import type { Office, OfficeFloor, UUID } from '@virtual-office/shared';
import { SupabaseService } from '../../common/supabase/supabase.service';

@Injectable()
export class OfficesService {
  constructor(private readonly supabaseService: SupabaseService) {}

  async findById(officeId: UUID): Promise<Office | null> {
    // TODO: query the `offices` table.
    void officeId;
    return null;
  }

  async findByOrganization(organizationId: UUID): Promise<Office[]> {
    // TODO: query all offices for an organization.
    void organizationId;
    return [];
  }

  async findFloors(officeId: UUID): Promise<OfficeFloor[]> {
    // TODO: query the `office_floors` table.
    void officeId;
    return [];
  }
}
