import {
  Controller,
  Post,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Body,
  BadRequestException,
  Request,
  UseGuards,
} from '@nestjs/common';
import { Roles } from '../../common/decorators/roles.decorator';
import { COUNTER_ROLES, STAFF_ROLES, UserRole } from '../../common/constants/user-role';
import { RolesGuard } from '../../common/guards/roles.guard';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { NotificationsService } from './notifications.service';

@Controller('notifications')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(...STAFF_ROLES, UserRole.READER)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Post('trigger-reminders')
  @Roles(...COUNTER_ROLES)
  triggerReminders() {
    return this.notificationsService.triggerDueReminders();
  }

  @Get()
  findAll() {
    return this.notificationsService.findAll();
  }

  @Get('mine')
  findMine(@Request() req: any) {
    return this.notificationsService.findMine(req.user.userId);
  }

  @Get('templates')
  @Roles(UserRole.ADMIN)
  getTemplates() {
    return this.notificationsService.getTemplates();
  }

  @Patch('templates/:id')
  @Roles(UserRole.ADMIN)
  updateTemplate(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: any,
  ) {
    return this.notificationsService.updateTemplate(id, body);
  }

  @Get('config')
  @Roles(UserRole.ADMIN)
  getMailConfiguration() {
    return this.notificationsService.getMailConfiguration();
  }

  @Post('test-smtp')
  @Roles(UserRole.ADMIN)
  testSmtp(@Body('email') email: string) {
    if (!email) throw new BadRequestException('Vui lòng cung cấp địa chỉ email nhận thư thử nghiệm');
    return this.notificationsService.testSmtpConnection(email.trim());
  }

  @Post('test-template')
  @Roles(UserRole.ADMIN)
  testTemplate(@Body() body: { id?: number; code?: string; subject?: string; content?: string; email: string }) {
    return this.notificationsService.testTemplate(body);
  }

  @Patch(':id/read')
  markRead(@Param('id', ParseIntPipe) id: number, @Request() req: any) {
    return this.notificationsService.markRead(id, req.user.userId);
  }
}
