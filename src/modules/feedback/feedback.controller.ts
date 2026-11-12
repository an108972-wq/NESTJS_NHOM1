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
import { FeedbackService } from './feedback.service';
import { CreateFeedbackDto, RespondFeedbackDto } from './dto/feedback.dto';

@Controller('feedback')
export class FeedbackController {
  constructor(private readonly feedbackService: FeedbackService) {}

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...STAFF_ROLES)
  findAll(
    @Query('category') category?: string,
    @Query('status') status?: string,
    @Query('search') search?: string,
  ) {
    return this.feedbackService.findAll(category, status, search);
  }

  @Get('stats')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...STAFF_ROLES)
  getStats() {
    return this.feedbackService.getStats();
  }

  @Get('public')
  findPublic() {
    return this.feedbackService.findAll(undefined, 'RESOLVED');
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...ALL_ROLES)
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.feedbackService.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateFeedbackDto, @Request() req: any) {
    const user = req.user || null;
    return this.feedbackService.create(dto, user);
  }

  @Patch(':id/respond')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...STAFF_ROLES)
  respond(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: RespondFeedbackDto,
    @Request() req: any,
  ) {
    const staffName = req.user?.fullName || req.user?.username || 'Thủ thư';
    return this.feedbackService.respond(id, dto, staffName);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...STAFF_ROLES)
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.feedbackService.remove(id);
  }
}

