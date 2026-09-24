import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import type { Room, RoomOccupancy } from '@virtual-office/shared';
import { RoomsService } from './rooms.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('rooms')
export class RoomsController {
  constructor(private readonly roomsService: RoomsService) {}

  @Get(':id')
  findOne(@Param('id') id: string): Promise<Room | null> {
    return this.roomsService.findById(id);
  }

  @Get(':id/occupancy')
  occupancy(@Param('id') id: string): Promise<RoomOccupancy | null> {
    return this.roomsService.getOccupancy(id);
  }
}
