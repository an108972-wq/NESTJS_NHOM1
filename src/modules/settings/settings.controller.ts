import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { Roles } from '../../common/decorators/roles.decorator';
import { STAFF_ROLES, UserRole } from '../../common/constants/user-role';
import { RolesGuard } from '../../common/guards/roles.guard';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UpdateLibrarySettingsDto } from './dto/update-library-settings.dto';
import { SettingsService } from './settings.service';

@Controller('system/settings')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

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
}
