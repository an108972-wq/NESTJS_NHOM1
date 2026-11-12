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
import { TutorialsService } from './tutorials.service';
import { CreateTutorialDto, RegisterTutorialDto, UpdateTutorialDto } from './dto/tutorial.dto';

@Controller('tutorials')
export class TutorialsController {
  constructor(private readonly tutorialsService: TutorialsService) {}

  @Get()
  findAll(
    @Query('category') category?: string,
    @Query('format') format?: string,
    @Query('status') status?: string,
    @Query('search') search?: string,
  ) {
    return this.tutorialsService.findAll(category, format, status, search);
  }

  @Get('stats')
  getStats() {
    return this.tutorialsService.getStats();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.tutorialsService.findOne(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...STAFF_ROLES)
  create(@Body() dto: CreateTutorialDto) {
    return this.tutorialsService.create(dto);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...STAFF_ROLES)
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateTutorialDto) {
    return this.tutorialsService.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...STAFF_ROLES)
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.tutorialsService.remove(id);
  }

  @Post(':id/register')
  register(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: RegisterTutorialDto,
    @Request() req: any,
  ) {
    const user = req.user || null;
    return this.tutorialsService.register(id, dto, user);
  }

  @Get(':id/registrations')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...STAFF_ROLES)
  getRegistrations(@Param('id', ParseIntPipe) id: number) {
    return this.tutorialsService.getRegistrations(id);
  }
}

