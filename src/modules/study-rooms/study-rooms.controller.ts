import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { ALL_ROLES, STAFF_ROLES } from '../../common/constants/user-role';
import { StudyRoomsService } from './study-rooms.service';
import {
  CreateStudyRoomDto,
  CreateRoomBookingDto,
  ReviewBookingDto,
} from './dto/study-room.dto';
import { RoomStatus } from './entities/study-room.entity';
import { BookingStatus } from './entities/room-booking.entity';

@Controller('study-rooms')
@UseGuards(JwtAuthGuard, RolesGuard)
export class StudyRoomsController {
  constructor(private readonly roomsService: StudyRoomsService) {}

  @Get()
  @Roles(...ALL_ROLES)
  findAll(@Query('status') status?: RoomStatus, @Query('search') search?: string) {
    return this.roomsService.findAll(status, search);
  }

  @Get('calendar')
  @Roles(...ALL_ROLES)
  getCalendar(@Query('date') date?: string) {
    return this.roomsService.getCalendar(date);
  }

  @Get('stats')
  @Roles(...STAFF_ROLES)
  getStats() {
    return this.roomsService.getStats();
  }

  @Get('bookings')
  @Roles(...ALL_ROLES)
  findBookings(
    @Request() req: any,
    @Query('date') date?: string,
    @Query('status') status?: BookingStatus,
  ) {
    const isStaff = req.user.role !== 'READER';
    const userId = isStaff ? undefined : req.user.id;
    return this.roomsService.findBookings(date, status, userId);
  }

  @Get(':id')
  @Roles(...ALL_ROLES)
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.roomsService.findOne(id);
  }

  @Post()
  @Roles(...STAFF_ROLES)
  create(@Body() dto: CreateStudyRoomDto) {
    return this.roomsService.create(dto);
  }

  @Patch(':id')
  @Roles(...STAFF_ROLES)
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: Partial<CreateStudyRoomDto>) {
    return this.roomsService.update(id, dto);
  }

  @Delete(':id')
  @Roles(...STAFF_ROLES)
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.roomsService.remove(id);
  }

  // --- Nghiệp vụ đặt phòng & Check-in ---
  @Post('bookings')
  @Roles(...ALL_ROLES)
  bookRoom(@Request() req: any, @Body() dto: CreateRoomBookingDto) {
    return this.roomsService.bookRoom(req.user.id, dto);
  }

  @Post('bookings/:id/review')
  @Roles(...STAFF_ROLES)
  reviewBooking(@Param('id', ParseIntPipe) id: number, @Body() dto: ReviewBookingDto) {
    return this.roomsService.reviewBooking(id, dto);
  }

  @Post('bookings/:id/check-in')
  @Roles(...ALL_ROLES)
  checkIn(@Param('id', ParseIntPipe) id: number, @Body('qrToken') qrToken: string) {
    return this.roomsService.checkIn(id, qrToken);
  }

  @Post('auto-cancel-no-show')
  @Roles(...STAFF_ROLES)
  autoCancelNoShow() {
    return this.roomsService.autoCancelNoShow();
  }
}

