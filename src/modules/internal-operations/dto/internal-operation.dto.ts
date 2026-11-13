import { IsEnum, IsNumber, IsOptional, IsString } from 'class-validator';
import {
  KpiRank,
  LibraryZone,
  ShiftStatus,
  ShiftType,
} from '../entities/internal-operation.entity';

export class CreateShiftDto {
  @IsString()
  shiftDate: string; // YYYY-MM-DD

  @IsEnum(ShiftType)
  shiftType: ShiftType;

  @IsEnum(LibraryZone)
  zone: LibraryZone;

  @IsNumber()
  @IsOptional()
  staffId?: number;

  @IsString()
  staffName: string;

  @IsEnum(ShiftStatus)
  @IsOptional()
  status?: ShiftStatus;

  @IsString()
  @IsOptional()
  note?: string;
}

export class UpdateShiftDto {
  @IsString()
  @IsOptional()
  shiftDate?: string;

  @IsEnum(ShiftType)
  @IsOptional()
  shiftType?: ShiftType;

  @IsEnum(LibraryZone)
  @IsOptional()
  zone?: LibraryZone;

  @IsNumber()
  @IsOptional()
  staffId?: number;

  @IsString()
  @IsOptional()
  staffName?: string;

  @IsEnum(ShiftStatus)
  @IsOptional()
  status?: ShiftStatus;

  @IsString()
  @IsOptional()
  swapWithStaffName?: string;

  @IsString()
  @IsOptional()
  note?: string;
}

export class SwapShiftDto {
  @IsString()
  swapWithStaffName: string;

  @IsString()
  @IsOptional()
  reason?: string;
}

export class CreateKpiDto {
  @IsNumber()
  staffId: number;

  @IsString()
  staffName: string;

  @IsString()
  @IsOptional()
  roleTitle?: string;

  @IsString()
  monthYear: string; // YYYY-MM

  @IsNumber()
  catalogedBooksCount: number;

  @IsNumber()
  processedLoansCount: number;

  @IsNumber()
  inventoryAuditsCount: number;

  @IsNumber()
  @IsOptional()
  satisfactionScore?: number;

  @IsString()
  @IsOptional()
  note?: string;
}

