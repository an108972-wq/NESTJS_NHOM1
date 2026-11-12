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
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { ALL_ROLES, STAFF_ROLES } from '../../common/constants/user-role';
import { LockersService } from './lockers.service';
import {
  CreateLockerDto,
  CreateBatchLockersDto,
  AssignLockerDto,
  ReleaseLockerDto,
} from './dto/locker.dto';
import { LockerStatus } from './entities/locker.entity';

@Controller('lockers')
@UseGuards(JwtAuthGuard, RolesGuard)
export class LockersController {
  constructor(private readonly lockersService: LockersService) {}

  @Get()
  @Roles(...ALL_ROLES)
  findAll(
    @Query('zone') zone?: string,
    @Query('cluster') cluster?: string,
    @Query('status') status?: LockerStatus,
    @Query('search') search?: string,
  ) {
    return this.lockersService.findAll(zone, cluster, status, search);
  }

  @Get('stats')
  @Roles(...ALL_ROLES)
  getStats() {
    return this.lockersService.getStats();
  }

  @Get('overdue-alerts')
  @Roles(...STAFF_ROLES)
  getOverdueAlerts() {
    return this.lockersService.getOverdueAlerts();
  }

  @Get(':id')
  @Roles(...ALL_ROLES)
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.lockersService.findOne(id);
  }

  @Post()
  @Roles(...STAFF_ROLES)
  create(@Body() dto: CreateLockerDto) {
    return this.lockersService.create(dto);
  }

  @Post('batch')
  @Roles(...STAFF_ROLES)
  createBatch(@Body() dto: CreateBatchLockersDto) {
    return this.lockersService.createBatch(dto);
  }

  @Patch(':id')
  @Roles(...STAFF_ROLES)
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: Partial<CreateLockerDto>) {
    return this.lockersService.update(id, dto);
  }

  @Delete(':id')
  @Roles(...STAFF_ROLES)
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.lockersService.remove(id);
  }

  // --- Cấp phát & Mở khóa ---
  @Post('assign')
  @Roles(...STAFF_ROLES)
  assignLocker(@Body() dto: AssignLockerDto) {
    return this.lockersService.assignLocker(dto);
  }

  @Post(':id/release')
  @Roles(...STAFF_ROLES)
  releaseLocker(@Param('id', ParseIntPipe) id: number, @Body() dto?: ReleaseLockerDto) {
    return this.lockersService.releaseLocker(id, dto);
  }

  @Post(':id/reset-pin')
  @Roles(...STAFF_ROLES)
  resetPin(@Param('id', ParseIntPipe) id: number) {
    return this.lockersService.resetPin(id);
  }
}

