import { Controller, Get, UseGuards } from '@nestjs/common';
import { STAFF_ROLES } from '../../common/constants/user-role';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ReportsService } from './reports.service';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AdminController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('dashboard-stats')
  @Roles(...STAFF_ROLES)
  getDashboardStats() {
    return this.reportsService.getDashboardStats();
  }
}
