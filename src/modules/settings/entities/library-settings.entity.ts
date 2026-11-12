import { Column, CreateDateColumn, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';

@Entity('library_settings')
export class LibrarySettings {
  @PrimaryColumn({ type: 'tinyint', default: 1 })
  id: number;

  @Column({ type: 'int', default: 5 })
  maxActiveLoans: number;

  @Column({ type: 'int', default: 14 })
  borrowDays: number;

  @Column({ type: 'int', default: 14 })
  renewalDays: number;

  @Column({ type: 'int', default: 5000 })
  dailyFineRate: number;

  @Column({ type: 'int', default: 50000 })
  fineLockThreshold: number;

  // 1. Tự động hóa Khóa tài khoản & Cảnh báo quá hạn (Automation Rules)
  @Column({ type: 'int', default: 30 })
  autoLockOverdueDays: number;

  @Column({ type: 'boolean', default: true })
  enableAutoLockOverdue: boolean;

  @Column({ type: 'boolean', default: true })
  enableAutoEmailReminders: boolean;

  @Column({ type: 'int', default: 2 })
  reminderDaysBeforeDue: number;

  // 2. Phân quyền Giới hạn Mượn theo Nhóm Độc giả (Role-based Quotas)
  @Column({ type: 'json', nullable: true })
  readerGroupQuotas?: Record<string, { name: string; maxActiveLoans: number; borrowDays: number }> | null;

  // 3. Cổng thanh toán trực tuyến & Phí dịch vụ
  @Column({ type: 'varchar', length: 50, default: 'MBBank' })
  vietqrBankId: string;

  @Column({ type: 'varchar', length: 50, default: '0388888888' })
  vietqrAccountNo: string;

  @Column({ type: 'varchar', length: 150, default: 'THU VIEN DAI HOC' })
  vietqrAccountName: string;

  @Column({ type: 'varchar', length: 50, default: '' })
  vnpayTmnCode: string;

  @Column({ type: 'varchar', length: 255, default: '' })
  vnpayHashSecret: string;

  @Column({ type: 'varchar', length: 255, default: 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html' })
  vnpayUrl: string;

  @Column({ type: 'varchar', length: 50, default: '' })
  momoPartnerCode: string;

  @Column({ type: 'varchar', length: 255, default: '' })
  momoAccessKey: string;

  @Column({ type: 'varchar', length: 255, default: '' })
  momoSecretKey: string;

  @Column({ type: 'int', default: 20000 })
  cardRegistrationFee: number;

  @Column({ type: 'int', default: 50000 })
  cardReissueFee: number;

  // 4. Sao lưu & Phục hồi Cơ sở dữ liệu tự động (Auto Backup)
  @Column({ type: 'varchar', length: 20, default: 'DAILY' })
  autoBackupSchedule: string;

  @Column({ type: 'datetime', nullable: true })
  lastBackupAt?: Date | null;

  @Column({ type: 'int', default: 30 })
  backupRetentionDays: number;

  // 5. Cấu hình Cổng gửi email tự động (SMTP Gateway)
  @Column({ type: 'varchar', length: 150, default: 'smtp.gmail.com' })
  smtpHost: string;

  @Column({ type: 'int', default: 587 })
  smtpPort: number;

  @Column({ type: 'boolean', default: false })
  smtpSecure: boolean;

  @Column({ type: 'varchar', length: 150, default: '' })
  smtpUser: string;

  @Column({ type: 'varchar', length: 255, default: '' })
  smtpPassword: string;

  @Column({ type: 'varchar', length: 150, default: 'thuvien@daihoc.edu.vn' })
  smtpFrom: string;

  // 6. Cấu hình Cổng tin nhắn SMS OTP (SMS Gateway)
  @Column({ type: 'varchar', length: 50, default: 'ESMS' })
  smsProvider: string;

  @Column({ type: 'varchar', length: 255, default: '' })
  smsApiKey: string;

  @Column({ type: 'varchar', length: 255, default: '' })
  smsApiSecret: string;

  @Column({ type: 'varchar', length: 100, default: 'THUVIEN_EDU' })
  smsBrandName: string;

  @Column({ type: 'varchar', length: 255, default: 'https://rest.esms.vn/MainService.svc/json/SendMultipleMessage_V4_get/' })
  smsEndpoint: string;

  @Column({ type: 'boolean', default: false })
  enableSmsOtp: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
