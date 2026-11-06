import {
  Controller,
  Delete,
  Get,
  Body,
  Param,
  ParseIntPipe,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { Roles } from '../../common/decorators/roles.decorator';
import { COUNTER_ROLES, STAFF_ROLES, UserRole } from '../../common/constants/user-role';
import { RolesGuard } from '../../common/guards/roles.guard';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ReservationsService } from './reservations.service';
import { CreateStaffReservationDto } from './dto/create-staff-reservation.dto';

@Controller('reservations')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ReservationsController {
  constructor(private readonly reservationsService: ReservationsService) {}

  @Get('mine')
  @Roles(...STAFF_ROLES, UserRole.READER)
  findMine(@Request() req: any) {
    return this.reservationsService.findMine(req.user.userId);
  }

  @Get()
  @Roles(...COUNTER_ROLES)
  findAll() {
    return this.reservationsService.findAll();
  }

  @Post('staff')
  @Roles(...COUNTER_ROLES)
  createForReader(@Body() dto: CreateStaffReservationDto) {
    return this.reservationsService.reserve(dto.userId, dto.bookId);
  }

  @Post(':id/ready')
  @Roles(...COUNTER_ROLES)
  markReady(@Param('id', ParseIntPipe) id: number) {
    return this.reservationsService.markReady(id);
  }

  @Post('books/:bookId')
  @Roles(...STAFF_ROLES, UserRole.READER)
  reserve(@Param('bookId', ParseIntPipe) bookId: number, @Request() req: any) {
    return this.reservationsService.reserve(req.user.userId, bookId);
  }

  @Post(':id/claim')
  @Roles(...STAFF_ROLES, UserRole.READER)
  claim(@Param('id', ParseIntPipe) id: number, @Request() req: any) {
    return this.reservationsService.claim(
      id,
      req.user.userId,
      COUNTER_ROLES.includes(req.user.role),
    );
  }

  @Delete(':id')
  @Roles(...STAFF_ROLES, UserRole.READER)
  cancel(@Param('id', ParseIntPipe) id: number, @Request() req: any) {
    return this.reservationsService.cancel(
      id,
      req.user.userId,
      COUNTER_ROLES.includes(req.user.role),
    );
  }
}
