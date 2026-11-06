import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Request,
  UseGuards,
} from '@nestjs/common';
import { Roles } from '../../common/decorators/roles.decorator';
import { STAFF_ROLES, UserRole } from '../../common/constants/user-role';
import { RolesGuard } from '../../common/guards/roles.guard';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { NotificationsService } from './notifications.service';

@Controller('notifications')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(...STAFF_ROLES, UserRole.READER)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get('mine')
  findMine(@Request() req: any) {
    return this.notificationsService.findMine(req.user.userId);
  }

  @Get('config')
  @Roles(UserRole.ADMIN)
  getMailConfiguration() {
    return this.notificationsService.getMailConfiguration();
  }

  @Patch(':id/read')
  markRead(@Param('id', ParseIntPipe) id: number, @Request() req: any) {
    return this.notificationsService.markRead(id, req.user.userId);
  }
}
