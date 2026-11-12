import { Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog } from './entities/audit-log.entity';

@Injectable()
export class AuditLogsService implements OnApplicationBootstrap {
  constructor(
    @InjectRepository(AuditLog)
    private readonly auditRepo: Repository<AuditLog>,
  ) {}

  async onApplicationBootstrap() {
    const count = await this.auditRepo.count();
    if (count === 0) {
      const now = new Date();
      await this.auditRepo.save([
        this.auditRepo.create({
          action: 'SYSTEM_INIT',
          module: 'SYSTEM',
          level: 'INFO',
          description: 'Hệ thống Quản lý Thư viện số khởi động thành công.',
          performerName: 'Hệ thống',
          performerRole: 'SYSTEM',
          ipAddress: '127.0.0.1',
          createdAt: new Date(now.getTime() - 86400000 * 2),
        }),
        this.auditRepo.create({
          action: 'LOGIN',
          module: 'AUTH',
          level: 'INFO',
          description: 'Quản trị viên đăng nhập vào hệ thống quản lý.',
          performerName: 'admin',
          performerRole: 'ADMIN',
          ipAddress: '127.0.0.1',
          createdAt: new Date(now.getTime() - 86400000),
        }),
        this.auditRepo.create({
          action: 'STOCK_CHECK',
          module: 'INVENTORY',
          level: 'WARNING',
          description: 'Thực hiện kiểm kê đối soát tự động toàn bộ kho sách phát hiện 2 bản sao lệch kệ.',
          performerName: 'admin',
          performerRole: 'ADMIN',
          ipAddress: '127.0.0.1',
          createdAt: new Date(now.getTime() - 3600000 * 5),
        }),
      ]);
    }
  }

  async log(data: {
    action: string;
    module: string;
    level?: string;
    description: string;
    performerId?: number;
    performerName?: string;
    performerRole?: string;
    ipAddress?: string;
  }) {
    let level = data.level;
    if (!level) {
      const act = (data.action || '').toUpperCase();
      const desc = (data.description || '').toUpperCase();
      if (act.includes('DELETE') || act.includes('ERROR') || act.includes('FAIL') || act.includes('LOST') || desc.includes('THẤT LẠC') || desc.includes('HỎNG')) {
        level = 'ERROR';
      } else if (act.includes('WARN') || act.includes('OVERDUE') || act.includes('REJECT') || act.includes('LOCK') || desc.includes('QUÁ HẠN') || desc.includes('LỆCH KỆ')) {
        level = 'WARNING';
      } else {
        level = 'INFO';
      }
    }
    const entry = this.auditRepo.create({ ...data, level });
    return this.auditRepo.save(entry);
  }

  async findAll(query?: {
    module?: string;
    action?: string;
    level?: string;
    search?: string;
    limit?: number;
    page?: number;
  }) {
    const qb = this.auditRepo.createQueryBuilder('log').orderBy('log.createdAt', 'DESC');

    if (query?.module && query.module.trim()) {
      qb.andWhere('log.module = :module', { module: query.module.trim() });
    }
    if (query?.action && query.action.trim()) {
      qb.andWhere('log.action = :action', { action: query.action.trim() });
    }
    if (query?.level && query.level.trim()) {
      qb.andWhere('log.level = :level', { level: query.level.trim().toUpperCase() });
    }
    if (query?.search && query.search.trim()) {
      const s = `%${query.search.trim()}%`;
      qb.andWhere(
        'log.description LIKE :s OR log.performerName LIKE :s OR log.action LIKE :s',
        { s },
      );
    }

    const limit = query?.limit ? Number(query.limit) : 50;
    const page = query?.page ? Number(query.page) : 1;
    qb.skip((page - 1) * limit).take(limit);

    const [items, total] = await qb.getManyAndCount();
    return { items, total, page, limit };
  }

  async getModulesAndActions() {
    const [modules, actions] = await Promise.all([
      this.auditRepo
        .createQueryBuilder('log')
        .select('DISTINCT log.module', 'module')
        .getRawMany(),
      this.auditRepo
        .createQueryBuilder('log')
        .select('DISTINCT log.action', 'action')
        .getRawMany(),
    ]);
    return {
      modules: modules.map((m) => m.module).filter(Boolean),
      actions: actions.map((a) => a.action).filter(Boolean),
    };
  }

  async getStaffPerformance(staffId?: number, staffName?: string) {
    const qb = this.auditRepo.createQueryBuilder('log');
    if (staffId && staffName) {
      qb.where('log.performerId = :staffId OR log.performerName = :staffName', { staffId, staffName });
    } else if (staffId) {
      qb.where('log.performerId = :staffId', { staffId });
    } else if (staffName) {
      qb.where('log.performerName = :staffName', { staffName });
    }

    const logs = await qb.orderBy('log.createdAt', 'DESC').take(100).getMany();

    const borrowsHandled = logs.filter(
      (l) =>
        l.action.includes('BORROW') ||
        l.action.includes('RETURN') ||
        l.description.toLowerCase().includes('mượn') ||
        l.description.toLowerCase().includes('trả'),
    ).length;
    const inventoryAudits = logs.filter(
      (l) =>
        l.action.includes('INVENTORY') ||
        l.action.includes('AUDIT') ||
        l.action === 'STOCK_CHECK' ||
        l.description.toLowerCase().includes('kiểm kê'),
    ).length;
    const acquisitionsHandled = logs.filter(
      (l) =>
        l.action.includes('ACQUISITION') ||
        l.action.includes('PURCHASE') ||
        l.description.toLowerCase().includes('mua'),
    ).length;
    const finesHandled = logs.filter(
      (l) =>
        l.action.includes('FINE') ||
        l.action.includes('VIOLATION') ||
        l.description.toLowerCase().includes('phạt'),
    ).length;

    return {
      totalActions: logs.length,
      borrowsHandled,
      inventoryAudits,
      acquisitionsHandled,
      finesHandled,
      lastActiveAt: logs[0]?.createdAt || null,
      recentLogs: logs.slice(0, 15),
    };
  }
}

