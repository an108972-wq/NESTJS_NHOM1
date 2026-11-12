import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { STAFF_ROLES } from '../../common/constants/user-role';

@Controller('reports')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('dashboard')
  @Roles(...STAFF_ROLES)
  getDashboard() {
    return this.reportsService.getDashboardStats();
  }

  @Get('analytics')
  @Roles(...STAFF_ROLES)
  getAnalytics(@Query('timeRange') timeRange?: string) {
    return this.reportsService.getAdvancedAnalytics(timeRange);
  }
}