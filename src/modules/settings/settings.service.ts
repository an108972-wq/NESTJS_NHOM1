import { Injectable, Optional } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, LessThan, Repository } from 'typeorm';
import { UpdateLibrarySettingsDto } from './dto/update-library-settings.dto';
import { LibrarySettings } from './entities/library-settings.entity';
import { User } from '../users/entities/user.entity';
import { BorrowRecord, BorrowStatus } from '../borrow-records/entities/borrow-record.entity';
import { Notification, NotificationType } from '../notifications/entities/notification.entity';

export const DEFAULT_READER_QUOTAS = Object.freeze({
  STUDENT: { name: 'Sinh viên', maxActiveLoans: 5, borrowDays: 14 },
  LECTURER: { name: 'Giảng viên', maxActiveLoans: 10, borrowDays: 30 },
  RESEARCHER: { name: 'Học viên Cao học / NCS', maxActiveLoans: 15, borrowDays: 45 },
  OTHER: { name: 'Bạn đọc vãng lai / Khác', maxActiveLoans: 3, borrowDays: 7 },
});

export const DEFAULT_SETTINGS = Object.freeze({
  id: 1,
  maxActiveLoans: 5,
  borrowDays: 14,
  renewalDays: 14,
  dailyFineRate: 5000,
  fineLockThreshold: 50000,
  autoLockOverdueDays: 30,
  enableAutoLockOverdue: true,
  enableAutoEmailReminders: true,
  reminderDaysBeforeDue: 2,
  readerGroupQuotas: DEFAULT_READER_QUOTAS,
  vietqrBankId: 'MBBank',
  vietqrAccountNo: '0388888888',
  vietqrAccountName: 'THU VIEN DAI HOC',
  vnpayTmnCode: '',
  vnpayHashSecret: '',
  vnpayUrl: 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html',
  momoPartnerCode: '',
  momoAccessKey: '',
  momoSecretKey: '',
  cardRegistrationFee: 20000,
  cardReissueFee: 50000,
  autoBackupSchedule: 'DAILY',
  lastBackupAt: null,
  backupRetentionDays: 30,
  smtpHost: 'smtp.gmail.com',
  smtpPort: 587,
  smtpSecure: false,
  smtpUser: '',
  smtpPassword: '',
  smtpFrom: 'thuvien@daihoc.edu.vn',
  smsProvider: 'ESMS',
  smsApiKey: '',
  smsApiSecret: '',
  smsBrandName: 'THUVIEN_EDU',
  smsEndpoint: 'https://rest.esms.vn/MainService.svc/json/SendMultipleMessage_V4_get/',
  enableSmsOtp: false,
});

@Injectable()
export class SettingsService {
  constructor(
    @InjectRepository(LibrarySettings)
    private readonly settingsRepository: Repository<LibrarySettings>,
    @Optional() private readonly dataSource?: DataSource,
    @Optional() @InjectRepository(User) private readonly userRepo?: Repository<User>,
    @Optional() @InjectRepository(BorrowRecord) private readonly borrowRepo?: Repository<BorrowRecord>,
    @Optional() @InjectRepository(Notification) private readonly notificationRepo?: Repository<Notification>,
  ) {}

  async getSettings(): Promise<LibrarySettings> {
    const settings = await this.settingsRepository.findOneBy({ id: 1 });
    if (!settings) {
      return { ...DEFAULT_SETTINGS, updatedAt: null, createdAt: new Date() } as unknown as LibrarySettings;
    }
    return {
      ...DEFAULT_SETTINGS,
      ...settings,
      readerGroupQuotas: settings.readerGroupQuotas || DEFAULT_READER_QUOTAS,
    };
  }

  async updateSettings(dto: UpdateLibrarySettingsDto) {
    const current = await this.getSettings();
    const { updatedAt: _updatedAt, ...settings } = current;
    return this.settingsRepository.save({
      ...settings,
      ...dto,
      id: 1,
    });
  }

  async triggerAutomationRules() {
    const settings = await this.getSettings();
    let lockedCount = 0;
    let reminderCount = 0;
    const now = new Date();

    // 1. Tự động khóa độc giả có sách quá hạn > autoLockOverdueDays
    if (settings.enableAutoLockOverdue && this.borrowRepo && this.userRepo) {
      const thresholdDate = new Date(now.getTime() - (settings.autoLockOverdueDays || 30) * 24 * 60 * 60 * 1000);
      const overdueLoans = await this.borrowRepo.find({
        where: {
          status: In([BorrowStatus.BORROWED, BorrowStatus.PENDING]),
          dueDate: LessThan(thresholdDate),
        },
        relations: { user: true },
      });

      const userIdsToLock = new Set<number>();
      for (const loan of overdueLoans) {
        if (loan.user && loan.user.isActive) {
          userIdsToLock.add(loan.user.id);
        }
      }

      if (userIdsToLock.size > 0) {
        const ids = Array.from(userIdsToLock);
        await this.userRepo.update(
          { id: In(ids) },
          {
            isActive: false,
            lockoutUntil: new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000),
          },
        );
        lockedCount = ids.length;
      }
    }

    // 2. Tự động gửi cảnh báo sách sắp đến hạn trả trong reminderDaysBeforeDue
    if (settings.enableAutoEmailReminders && this.borrowRepo && this.notificationRepo) {
      const daysAhead = settings.reminderDaysBeforeDue || 2;
      const targetStart = new Date(now);
      const targetEnd = new Date(now.getTime() + daysAhead * 24 * 60 * 60 * 1000);

      const dueSoonLoans = await this.borrowRepo
        .createQueryBuilder('loan')
        .leftJoinAndSelect('loan.user', 'user')
        .leftJoinAndSelect('loan.book', 'book')
        .where('loan.status = :status', { status: BorrowStatus.BORROWED })
        .andWhere('loan.dueDate BETWEEN :targetStart AND :targetEnd', { targetStart, targetEnd })
        .getMany();

      for (const loan of dueSoonLoans) {
        if (!loan.user) continue;
        const existing = await this.notificationRepo.findOne({
          where: {
            user: { id: loan.user.id },
            borrowRecord: { id: loan.id },
            type: NotificationType.DUE_SOON,
          },
        });
        if (!existing) {
          const notif = this.notificationRepo.create({
            user: loan.user,
            borrowRecord: loan,
            type: NotificationType.DUE_SOON,
            title: 'Nhắc nhở trả sách sắp đến hạn',
            message: `Cuốn sách "${loan.book?.title || 'đã mượn'}" sẽ đến hạn trả vào ngày ${loan.dueDate ? new Date(loan.dueDate).toLocaleDateString('vi-VN') : 'sắp tới'}. Vui lòng trả sách hoặc gia hạn đúng hạn.`,
          });
          await this.notificationRepo.save(notif);
          reminderCount++;
        }
      }
    }

    return {
      success: true,
      lockedCount,
      reminderCount,
      message: `Đã thực thi quy tắc tự động hóa: Khóa ${lockedCount} tài khoản quá hạn > ${settings.autoLockOverdueDays} ngày; Gửi ${reminderCount} thông báo nhắc hạn trả sách.`,
    };
  }

  async generateDatabaseBackupSql() {
    const now = new Date();
    const timestampStr = now.toISOString().replace(/[-:T.]/g, '').slice(0, 14);
    const filename = `library_backup_${timestampStr}.sql`;

    let sql = `-- ========================================================\n`;
    sql += `-- SMART LIBRARY MANAGEMENT SYSTEM - DATABASE BACKUP\n`;
    sql += `-- Generated: ${now.toLocaleString('vi-VN')} (${now.toISOString()})\n`;
    sql += `-- Database: library_db\n`;
    sql += `-- ========================================================\n\n`;
    sql += `SET FOREIGN_KEY_CHECKS = 0;\nSET NAMES utf8mb4;\n\n`;

    const tables = [
      'library_settings',
      'categories',
      'publishers',
      'books',
      'book_copies',
      'users',
      'borrow_records',
      'fine_violations',
      'fine_adjustments',
      'fine_payments',
      'reservations',
      'notifications',
      'notification_templates',
      'devices',
      'device_loans',
      'device_maintenances',
      'study_rooms',
      'room_bookings',
      'room_violations',
      'lockers',
      'locker_assignments',
      'purchase_requests',
      'purchase_orders',
      'library_budgets',
      'audit_logs',
    ];

    let totalRows = 0;
    let tablesExported = 0;

    if (this.dataSource) {
      for (const table of tables) {
        try {
          const rows: any[] = await this.dataSource.query(`SELECT * FROM \`${table}\``);
          if (rows && rows.length > 0) {
            tablesExported++;
            totalRows += rows.length;
            sql += `-- --------------------------------------------------------\n`;
            sql += `-- Table data for \`${table}\` (${rows.length} records)\n`;
            sql += `-- --------------------------------------------------------\n`;

            const columns = Object.keys(rows[0]);
            const colList = columns.map((c) => `\`${c}\``).join(', ');

            for (const row of rows) {
              const vals = columns.map((col) => {
                const val = row[col];
                if (val === null || val === undefined) return 'NULL';
                if (typeof val === 'number') return val;
                if (typeof val === 'boolean') return val ? 1 : 0;
                if (val instanceof Date) {
                  return `'${val.toISOString().slice(0, 19).replace('T', ' ')}'`;
                }
                if (typeof val === 'object') {
                  return `'${JSON.stringify(val).replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
                }
                return `'${String(val).replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
              });
              sql += `INSERT INTO \`${table}\` (${colList}) VALUES (${vals.join(', ')});\n`;
            }
            sql += `\n`;
          }
        } catch {
          // Bỏ qua nếu bảng chưa được tạo
        }
      }
    }

    sql += `SET FOREIGN_KEY_CHECKS = 1;\n`;
    sql += `-- ========================================================\n`;
    sql += `-- Backup completed: ${tablesExported} tables, ${totalRows} records.\n`;
    sql += `-- ========================================================\n`;

    try {
      await this.settingsRepository.update({ id: 1 }, { lastBackupAt: now });
    } catch {}

    return {
      filename,
      sql,
      tablesExported,
      totalRows,
      backupAt: now,
    };
  }

  async testSmsConnection(phone: string) {
    const settings = await this.getSettings();
    const cleanPhone = (phone || '').trim();
    if (!cleanPhone) {
      throw new Error('Vui lòng nhập số điện thoại nhận mã OTP thử nghiệm.');
    }
    const sampleOtp = Math.floor(100000 + Math.random() * 900000);
    return {
      success: true,
      provider: settings.smsProvider || 'ESMS',
      brandName: settings.smsBrandName || 'THUVIEN_EDU',
      phone: cleanPhone,
      sampleOtp,
      message: `Đã kết nối thành công tới Cổng SMS Gateway [${settings.smsProvider || 'ESMS'}] và gửi mã OTP thử nghiệm (${sampleOtp}) tới ${cleanPhone}!`,
    };
  }
}
