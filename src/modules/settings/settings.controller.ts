import {
  Body,
  Controller,
  Get,
  Header,
  Patch,
  Post,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { Roles } from '../../common/decorators/roles.decorator';
import { STAFF_ROLES, UserRole } from '../../common/constants/user-role';
import { RolesGuard } from '../../common/guards/roles.guard';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UpdateLibrarySettingsDto } from './dto/update-library-settings.dto';
import { SettingsService } from './settings.service';

@Controller('system/settings')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) { }

  @Get()
  @Roles(...STAFF_ROLES)
  getSettings() {
    return this.settingsService.getSettings();
  }

  @Patch()
  @Roles(UserRole.ADMIN)
  updateSettings(@Body() dto: UpdateLibrarySettingsDto) {
    return this.settingsService.updateSettings(dto);
  }

  @Post('trigger-automation')
  @Roles(UserRole.ADMIN)
  triggerAutomationRules() {
    return this.settingsService.triggerAutomationRules();
  }

  @Post('test-sms')
  @Roles(UserRole.ADMIN)
  testSms(@Body('phone') phone: string) {
    return this.settingsService.testSmsConnection(phone);
  }

  @Post('clean-test-data')
  @Roles(UserRole.ADMIN)
  cleanTestData() {
    return this.settingsService.cleanTestData();
  }

  @Post('backup/manual')
  @Roles(UserRole.ADMIN)
  triggerManualBackup() {
    return this.settingsService.generateDatabaseBackupSql();
  }

  @Get('backup/download')
  @Roles(UserRole.ADMIN)
  async downloadBackupSql(@Res() res: Response) {
    const backup = await this.settingsService.generateDatabaseBackupSql();
    res.setHeader('Content-Type', 'application/sql; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${backup.filename}"`);
    return res.send(backup.sql);
  }
}
