import { Module } from '@nestjs/common';
import { AvatarProfileRepository } from './avatar-profile.repository';
import { AvatarProfilesController } from './avatar-profiles.controller';
import { AvatarProfilesService } from './avatar-profiles.service';

@Module({
  controllers: [AvatarProfilesController],
  providers: [AvatarProfileRepository, AvatarProfilesService],
  exports: [AvatarProfilesService],
})
export class AvatarsModule {}
