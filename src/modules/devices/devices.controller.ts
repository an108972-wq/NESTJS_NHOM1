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
import { DevicesService } from './devices.service';
import { CreateDeviceDto } from './dto/create-device.dto';
import {
  CreateDeviceLoanDto,
  ReturnDeviceLoanDto,
  CreateMaintenanceDto,
} from './dto/device-actions.dto';
import { DeviceCategory, DeviceStatus } from './entities/device.entity';
import { DeviceLoanStatus } from './entities/device-loan.entity';

@Controller('devices')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DevicesController {
  constructor(private readonly devicesService: DevicesService) {}

  @Get()
  @Roles(...ALL_ROLES)
  findAll(
    @Query('status') status?: DeviceStatus,
    @Query('category') category?: DeviceCategory,
    @Query('search') search?: string,
  ) {
    return this.devicesService.findAll(status, category, search);
  }

  @Get('stats')
  @Roles(...ALL_ROLES)
  getStats() {
    return this.devicesService.getStats();
  }

  @Get('loans')
  @Roles(...ALL_ROLES)
  findLoans(
    @Request() req: any,
    @Query('status') status?: DeviceLoanStatus,
    @Query('deviceId') deviceId?: number,
  ) {
    // Nếu là độc giả thông thường, chỉ xem các lượt mượn của chính mình
    const isStaff = req.user.role !== 'READER';
    const userId = isStaff ? undefined : req.user.id;
    return this.devicesService.findLoans(status, deviceId ? Number(deviceId) : undefined, userId);
  }

  @Get('loans/:id/handover')
  @Roles(...ALL_ROLES)
  getHandoverData(@Param('id', ParseIntPipe) id: number) {
    return this.devicesService.getHandoverData(id);
  }

  @Get('maintenances')
  @Roles(...STAFF_ROLES)
  findMaintenances(@Query('deviceId') deviceId?: number) {
    return this.devicesService.findMaintenances(deviceId ? Number(deviceId) : undefined);
  }

  @Get(':id')
  @Roles(...ALL_ROLES)
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.devicesService.findOne(id);
  }

  @Post()
  @Roles(...STAFF_ROLES)
  create(@Body() dto: CreateDeviceDto) {
    return this.devicesService.create(dto);
  }

  @Patch(':id')
  @Roles(...STAFF_ROLES)
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: Partial<CreateDeviceDto>) {
    return this.devicesService.update(id, dto);
  }

  @Delete(':id')
  @Roles(...STAFF_ROLES)
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.devicesService.remove(id);
  }

  // --- Mượn trả & Bảo trì ---
  @Post('loans')
  @Roles(...STAFF_ROLES)
  createLoan(@Body() dto: CreateDeviceLoanDto) {
    return this.devicesService.createLoan(dto);
  }

  @Post('loans/:id/return')
  @Roles(...STAFF_ROLES)
  returnLoan(@Param('id', ParseIntPipe) id: number, @Body() dto: ReturnDeviceLoanDto) {
    return this.devicesService.returnLoan(id, dto);
  }

  @Post('maintenances')
  @Roles(...STAFF_ROLES)
  createMaintenance(@Body() dto: CreateMaintenanceDto) {
    return this.devicesService.createMaintenance(dto);
  }

  @Post('maintenances/:id/complete')
  @Roles(...STAFF_ROLES)
  completeMaintenance(@Param('id', ParseIntPipe) id: number, @Body('notes') notes?: string) {
    return this.devicesService.completeMaintenance(id, notes);
  }
}

