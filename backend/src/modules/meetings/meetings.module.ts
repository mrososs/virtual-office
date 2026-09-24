import { Module } from '@nestjs/common';
import { MeetingsController } from './meetings.controller';
import { MeetingsService } from './meetings.service';
import { MeetingSchedulerService } from './meeting-scheduler.service';
import { MeetingRoomAllocator } from './meeting-room-allocator.service';
import { MeetingParticipantMapper } from './meeting-participant.mapper';
import { RoomsModule } from '../rooms/rooms.module';
import { EmployeesModule } from '../employees/employees.module';

@Module({
  imports: [RoomsModule, EmployeesModule],
  controllers: [MeetingsController],
  providers: [MeetingsService, MeetingSchedulerService, MeetingRoomAllocator, MeetingParticipantMapper],
  exports: [MeetingsService, MeetingSchedulerService, MeetingRoomAllocator, MeetingParticipantMapper],
})
export class MeetingsModule {}
