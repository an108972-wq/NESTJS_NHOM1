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
import { STAFF_ROLES } from '../../common/constants/user-role';
import { InternalOperationsService } from './internal-operations.service';
import {
  CreateKpiDto,
  CreateShiftDto,
  SwapShiftDto,
  UpdateShiftDto,
} from './dto/internal-operation.dto';

@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(...STAFF_ROLES)
export class InternalOperationsController {
  constructor(private readonly service: InternalOperationsService) {}

  // --- SHIFTS ENDPOINTS ---
  @Get('shift-schedules')
  findAllShifts(
    @Query('date') date?: string,
    @Query('shiftType') shiftType?: string,
    @Query('zone') zone?: string,
  ) {
    return this.service.findAllShifts(date, shiftType, zone);
  }

  @Get('shift-schedules/stats')
  getShiftsStats() {
    return this.service.getShiftsStats();
  }

  @Post('shift-schedules')
  createShift(@Body() dto: CreateShiftDto) {
    return this.service.createShift(dto);
  }

  @Patch('shift-schedules/:id')
  updateShift(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateShiftDto) {
    return this.service.updateShift(id, dto);
  }

  @Patch('shift-schedules/:id/swap')
  swapShift(@Param('id', ParseIntPipe) id: number, @Body() dto: SwapShiftDto) {
    return this.service.swapShift(id, dto);
  }

  @Delete('shift-schedules/:id')
  deleteShift(@Param('id', ParseIntPipe) id: number) {
    return this.service.deleteShift(id);
  }

  // --- KPI ENDPOINTS ---
  @Get('staff-kpi')
  findAllKpi(@Query('monthYear') monthYear?: string) {
    return this.service.findAllKpi(monthYear);
  }

  @Get('staff-kpi/stats')
  getKpiStats(@Query('monthYear') monthYear?: string) {
    return this.service.getKpiStats(monthYear);
  }

  @Post('staff-kpi')
  createKpi(@Body() dto: CreateKpiDto) {
    return this.service.createKpi(dto);
  }

  @Delete('staff-kpi/:id')
  deleteKpi(@Param('id', ParseIntPipe) id: number) {
    return this.service.deleteKpi(id);
  }
}

