import { Type } from 'class-transformer';
import { IsBoolean, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class UpdateLibrarySettingsDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  maxActiveLoans?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(60)
  borrowDays?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(7)
  @Max(14)
  renewalDays?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(1_000_000)
  dailyFineRate?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(10_000_000)
  fineLockThreshold?: number;

  // 1. Tự động hóa Khóa tài khoản & Cảnh báo quá hạn
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(365)
  autoLockOverdueDays?: number;

  @IsOptional()
  @IsBoolean()
  enableAutoLockOverdue?: boolean;

  @IsOptional()
  @IsBoolean()
  enableAutoEmailReminders?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(30)
  reminderDaysBeforeDue?: number;

  // 2. Giới hạn theo Nhóm Độc giả
  @IsOptional()
  readerGroupQuotas?: Record<string, { name: string; maxActiveLoans: number; borrowDays: number }> | null;

  // 3. Cổng thanh toán & Phí dịch vụ
  @IsOptional()
  @IsString()
  vietqrBankId?: string;

  @IsOptional()
  @IsString()
  vietqrAccountNo?: string;

  @IsOptional()
  @IsString()
  vietqrAccountName?: string;

  @IsOptional()
  @IsString()
  vnpayTmnCode?: string;

  @IsOptional()
  @IsString()
  vnpayHashSecret?: string;

  @IsOptional()
  @IsString()
  vnpayUrl?: string;

  @IsOptional()
  @IsString()
  momoPartnerCode?: string;

  @IsOptional()
  @IsString()
  momoAccessKey?: string;

  @IsOptional()
  @IsString()
  momoSecretKey?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  cardRegistrationFee?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  cardReissueFee?: number;

  // 4. Sao lưu dữ liệu
  @IsOptional()
  @IsString()
  autoBackupSchedule?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  backupRetentionDays?: number;

  // 5. Cấu hình Cổng gửi email tự động (SMTP Gateway)
  @IsOptional()
  @IsString()
  smtpHost?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(65535)
  smtpPort?: number;

  @IsOptional()
  @IsBoolean()
  smtpSecure?: boolean;

  @IsOptional()
  @IsString()
  smtpUser?: string;

  @IsOptional()
  @IsString()
  smtpPassword?: string;

  @IsOptional()
  @IsString()
  smtpFrom?: string;

  // 6. Cổng tin nhắn SMS OTP (SMS Gateway)
  @IsOptional()
  @IsString()
  smsProvider?: string;

  @IsOptional()
  @IsString()
  smsApiKey?: string;

  @IsOptional()
  @IsString()
  smsApiSecret?: string;

  @IsOptional()
  @IsString()
  smsBrandName?: string;

  @IsOptional()
  @IsString()
  smsEndpoint?: string;

  @IsOptional()
  @IsBoolean()
  enableSmsOtp?: boolean;
}
