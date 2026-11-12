import { IsBoolean, IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';
import { DeviceLoanType } from '../entities/device-loan.entity';

export class CreateDeviceLoanDto {
  @IsNotEmpty()
  @IsNumber()
  deviceId: number;

  @IsNotEmpty()
  @IsNumber()
  userId: number;

  @IsOptional()
  @IsEnum(DeviceLoanType)
  loanType?: DeviceLoanType;

  @IsOptional()
  @IsNumber()
  durationHours?: number; // Ví dụ: 2 tiếng hoặc 24 tiếng

  @IsOptional()
  @IsString()
  preCondition?: string;

  @IsOptional()
  @IsBoolean()
  accessoriesChecked?: boolean;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class ReturnDeviceLoanDto {
  @IsOptional()
  @IsString()
  postCondition?: string;

  @IsOptional()
  @IsBoolean()
  accessoriesChecked?: boolean;

  @IsOptional()
  @IsNumber()
  additionalFine?: number;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class CreateMaintenanceDto {
  @IsNotEmpty()
  @IsNumber()
  deviceId: number;

  @IsNotEmpty()
  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  maintenanceType?: string;

  @IsOptional()
  @IsNumber()
  cost?: number;

  @IsNotEmpty()
  @IsString()
  scheduledDate: string;

  @IsOptional()
  @IsString()
  technician?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

