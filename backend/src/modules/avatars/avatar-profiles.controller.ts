import { Body, Controller, Get, Put, UseGuards } from '@nestjs/common';
import type { AvatarProfile } from '@virtual-office/shared';
import { CurrentSession, SessionAuthGuard } from '../session/session-auth.guard';
import type { AuthContext } from '../session/session.types';
import { AvatarProfilesService } from './avatar-profiles.service';
import { SaveAvatarProfileDto } from './dto/save-avatar-profile.dto';

/** The signed-in employee's own avatar. The owner always comes from the session, never the payload. */
@UseGuards(SessionAuthGuard)
@Controller('avatar-profiles')
export class AvatarProfilesController {
  constructor(private readonly avatars: AvatarProfilesService) {}

  @Get('me')
  async getMine(@CurrentSession() auth: AuthContext): Promise<{ profile: AvatarProfile | null }> {
    return { profile: await this.avatars.getForEmployee(auth.employee.id) };
  }

  @Put('me')
  saveMine(@CurrentSession() auth: AuthContext, @Body() dto: SaveAvatarProfileDto): Promise<AvatarProfile> {
    return this.avatars.save(auth.employee.id, dto);
  }
}
