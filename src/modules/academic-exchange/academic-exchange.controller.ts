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
import { AcademicExchangeService } from './academic-exchange.service';
import {
  CreateExchangeGrantDto,
  CreateSeminarDto,
  RegisterSeminarDto,
  UpdateExchangeGrantDto,
  UpdateSeminarDto,
} from './dto/academic-exchange.dto';

@Controller()
export class AcademicExchangeController {
  constructor(private readonly service: AcademicExchangeService) {}

  // --- SEMINARS ENDPOINTS ---
  @Get('seminars')
  findAllSeminars(
    @Query('status') status?: string,
    @Query('search') search?: string,
  ) {
    return this.service.findAllSeminars(status, search);
  }

  @Get('seminars/stats')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...STAFF_ROLES)
  getSeminarsStats() {
    return this.service.getSeminarsStats();
  }

  @Get('seminars/:id')
  findSeminarById(@Param('id', ParseIntPipe) id: number) {
    return this.service.findSeminarById(id);
  }

  @Post('seminars')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...STAFF_ROLES)
  createSeminar(@Body() dto: CreateSeminarDto) {
    return this.service.createSeminar(dto);
  }

  @Patch('seminars/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...STAFF_ROLES)
  updateSeminar(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateSeminarDto) {
    return this.service.updateSeminar(id, dto);
  }

  @Delete('seminars/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...STAFF_ROLES)
  deleteSeminar(@Param('id', ParseIntPipe) id: number) {
    return this.service.deleteSeminar(id);
  }

  @Post('seminars/:id/register')
  registerSeminar(@Param('id', ParseIntPipe) id: number, @Body() dto: RegisterSeminarDto) {
    return this.service.registerSeminar(id, dto);
  }

  @Patch('seminars/:id/check-in')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...STAFF_ROLES)
  checkInAttendee(@Param('id', ParseIntPipe) id: number, @Body('attendeeId') attendeeId: string) {
    return this.service.checkInAttendee(id, attendeeId);
  }

  // --- EXCHANGE GRANTS ENDPOINTS ---
  @Get('exchange-grants')
  findAllGrants(
    @Query('programType') programType?: string,
    @Query('status') status?: string,
    @Query('search') search?: string,
  ) {
    return this.service.findAllGrants(programType, status, search);
  }

  @Get('exchange-grants/stats')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...STAFF_ROLES)
  getGrantsStats() {
    return this.service.getGrantsStats();
  }

  @Post('exchange-grants')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...STAFF_ROLES)
  createGrant(@Body() dto: CreateExchangeGrantDto) {
    return this.service.createGrant(dto);
  }

  @Patch('exchange-grants/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...STAFF_ROLES)
  updateGrant(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateExchangeGrantDto) {
    return this.service.updateGrant(id, dto);
  }

  @Delete('exchange-grants/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...STAFF_ROLES)
  deleteGrant(@Param('id', ParseIntPipe) id: number) {
    return this.service.deleteGrant(id);
  }
}

