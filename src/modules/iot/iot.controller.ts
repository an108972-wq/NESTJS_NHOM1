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
import { IotService } from './iot.service';
import {
  CreateIotDeviceDto,
  DeviceActionDto,
  UpdateIotDeviceDto,
} from './dto/iot-device.dto';

@Controller('iot')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(...STAFF_ROLES)
export class IotController {
  constructor(private readonly iotService: IotService) {}

  @Get('devices')
  findAll(
    @Query('type') type?: string,
    @Query('status') status?: string,
    @Query('search') search?: string,
  ) {
    return this.iotService.findAll(type, status, search);
  }

  @Get('stats')
  getStats() {
    return this.iotService.getStats();
  }

  @Get('devices/:id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.iotService.findOne(id);
  }

  @Post('devices')
  create(@Body() dto: CreateIotDeviceDto) {
    return this.iotService.create(dto);
  }

  @Patch('devices/:id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateIotDeviceDto) {
    return this.iotService.update(id, dto);
  }

  @Delete('devices/:id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.iotService.remove(id);
  }

  @Post('devices/:id/action')
  executeAction(
    @Param('id', ParseIntPipe) id: number,
    @Body() actionDto: DeviceActionDto,
  ) {
    return this.iotService.executeAction(id, actionDto);
  }
}

