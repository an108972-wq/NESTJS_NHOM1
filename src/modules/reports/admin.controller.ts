import { Controller, Get, UseGuards } from '@nestjs/common';
import { STAFF_ROLES } from '../../common/constants/user-role';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ReportsService } from './reports.service';

@Controller('admin')
export class AdminController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('dashboard-stats')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...STAFF_ROLES)
  getDashboardStats() {
    return this.reportsService.getDashboardStats();
  }

  @Get('analytics')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...STAFF_ROLES)
  getAnalytics() {
    return this.reportsService.getAdvancedAnalytics();
  }
}
