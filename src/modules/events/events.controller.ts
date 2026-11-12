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
import { EventsService } from './events.service';
import { BroadcastEventDto, CreateEventDto, UpdateEventDto } from './dto/event.dto';

@Controller('events')
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  @Get()
  findAll(
    @Query('type') type?: string,
    @Query('status') status?: string,
    @Query('targetAudience') targetAudience?: string,
    @Query('search') search?: string,
  ) {
    return this.eventsService.findAll(type, status, targetAudience, search);
  }

  @Get('stats')
  getStats() {
    return this.eventsService.getStats();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.eventsService.findOne(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...STAFF_ROLES)
  create(@Body() dto: CreateEventDto, @Request() req: any) {
    const name = req.user?.fullName || req.user?.username || 'Thủ thư';
    return this.eventsService.create(dto, name);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...STAFF_ROLES)
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateEventDto) {
    return this.eventsService.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...STAFF_ROLES)
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.eventsService.remove(id);
  }

  @Post(':id/broadcast')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...STAFF_ROLES)
  broadcast(@Param('id', ParseIntPipe) id: number, @Body() dto: BroadcastEventDto) {
    return this.eventsService.broadcast(id, dto);
  }
}

