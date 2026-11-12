import { Controller, Get, Res } from '@nestjs/common';
import { join } from 'path';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) { }

  @Get('hello')
  getHello(): string {
    return this.appService.getHello();
  }

  // ==========================================
  // PHÂN HỆ QUẢN TRỊ ADMINLTE CHUYÊN BIỆT
  // Phục vụ giao diện layout AdminLTE độc lập (admin.html)
  // Chỉ đón các URL trang giao diện SPA, không chặn các API endpoint như /admin/dashboard-stats
  // ==========================================
  @Get([
    'admin',
    'admin/dashboard',
    'admin/books',
    'admin/loans',
    'admin/borrow',
    'admin/borrow-return',
    'admin/readers',
    'admin/users',
    'admin/users/:id',
    'admin/categories',
    'admin/publishers',
    'admin/reports',
    'admin/fines',
    'admin/reservations',
    'admin/settings',
    'admin/staffs',
    'admin/audit-logs',
    'admin/inventory-audit',
    'admin/shelves',
    'admin/acquisitions',
    'admin/elibrary',
    'admin/budgets',
    'admin/notification-templates',
    'admin/devices',
    'admin/study-rooms',
    'admin/lockers',
  ])
  serveAdminSpa(@Res() res: any) {
    return res.sendFile(join(process.cwd(), 'public', 'admin.html'));
  }

  // ==========================================
  // CỔNG TRA CỨU OPAC & DỊCH VỤ ĐỘC GIẢ
  // Phục vụ giao diện cổng tra cứu cộng đồng (index.html)
  // ==========================================
  @Get([
    '',
    'opac',
    'search',
    'register',
    'profile',
    'study-rooms',
    'devices',
    'lockers',
  ])
  serveOpacSpa(@Res() res: any) {
    return res.sendFile(join(process.cwd(), 'public', 'index.html'));
  }
}
