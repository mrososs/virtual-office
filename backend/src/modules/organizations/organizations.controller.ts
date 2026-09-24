import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { OrganizationsService } from './organizations.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { Organization } from './entities/organization.entity';

@UseGuards(JwtAuthGuard)
@Controller('organizations')
export class OrganizationsController {
  constructor(private readonly organizationsService: OrganizationsService) {}

  @Get(':id')
  findOne(@Param('id') id: string): Promise<Organization | null> {
    return this.organizationsService.findById(id);
  }
}
