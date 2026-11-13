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
import { AcademicResourcesService } from './academic-resources.service';
import {
  CreateMultimediaDto,
  CreateThesisDto,
  UpdateMultimediaDto,
  UpdateThesisDto,
} from './dto/academic-resource.dto';

@Controller()
export class AcademicResourcesController {
  constructor(private readonly service: AcademicResourcesService) {}

  // --- THESES ENDPOINTS ---
  @Get('theses')
  findAllTheses(
    @Query('major') major?: string,
    @Query('securityStatus') securityStatus?: string,
    @Query('search') search?: string,
  ) {
    return this.service.findAllTheses(major, securityStatus, search);
  }

  @Get('theses/stats')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...STAFF_ROLES)
  getThesesStats() {
    return this.service.getThesesStats();
  }

  @Get('theses/:id')
  findThesisById(@Param('id', ParseIntPipe) id: number) {
    return this.service.findThesisById(id);
  }

  @Post('theses')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...STAFF_ROLES)
  createThesis(@Body() dto: CreateThesisDto) {
    return this.service.createThesis(dto);
  }

  @Patch('theses/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...STAFF_ROLES)
  updateThesis(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateThesisDto) {
    return this.service.updateThesis(id, dto);
  }

  @Delete('theses/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...STAFF_ROLES)
  deleteThesis(@Param('id', ParseIntPipe) id: number) {
    return this.service.deleteThesis(id);
  }

  // --- MULTIMEDIA ENDPOINTS ---
  @Get('multimedia')
  findAllMultimedia(
    @Query('type') type?: string,
    @Query('condition') condition?: string,
    @Query('search') search?: string,
  ) {
    return this.service.findAllMultimedia(type, condition, search);
  }

  @Get('multimedia/stats')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...STAFF_ROLES)
  getMultimediaStats() {
    return this.service.getMultimediaStats();
  }

  @Get('multimedia/:id')
  findMultimediaById(@Param('id', ParseIntPipe) id: number) {
    return this.service.findMultimediaById(id);
  }

  @Post('multimedia')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...STAFF_ROLES)
  createMultimedia(@Body() dto: CreateMultimediaDto) {
    return this.service.createMultimedia(dto);
  }

  @Patch('multimedia/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...STAFF_ROLES)
  updateMultimedia(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateMultimediaDto) {
    return this.service.updateMultimedia(id, dto);
  }

  @Delete('multimedia/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...STAFF_ROLES)
  deleteMultimedia(@Param('id', ParseIntPipe) id: number) {
    return this.service.deleteMultimedia(id);
  }

  @Post('multimedia/:id/on-site-loan')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...STAFF_ROLES)
  recordOnSiteLoan(@Param('id', ParseIntPipe) id: number) {
    return this.service.recordOnSiteLoan(id);
  }
}

