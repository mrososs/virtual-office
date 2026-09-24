import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../../common/supabase/supabase.service';
import { Organization } from './entities/organization.entity';

@Injectable()
export class OrganizationsService {
  constructor(private readonly supabaseService: SupabaseService) {}

  async findById(organizationId: string): Promise<Organization | null> {
    // TODO: query the `organizations` table.
    void organizationId;
    return null;
  }

  async create(input: Pick<Organization, 'name' | 'slug'>): Promise<Organization> {
    // TODO: insert into `organizations`.
    throw new Error('Not implemented');
  }
}
