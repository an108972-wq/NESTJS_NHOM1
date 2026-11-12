import { IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';
import { LockerStatus } from '../entities/locker.entity';
import { AssignmentType } from '../entities/locker-assignment.entity';

export class CreateLockerDto {
  @IsNotEmpty()
  @IsString()
  lockerNumber: string;

  @IsOptional()
  @IsString()
  zone?: string;

  @IsOptional()
  @IsString()
  cluster?: string;

  @IsOptional()
  @IsEnum(LockerStatus)
  status?: LockerStatus;
}

export class CreateBatchLockersDto {
  @IsNotEmpty()
  @IsString()
  prefix: string; // e.g. "LK-A"

  @IsNotEmpty()
  @IsNumber()
  fromNumber: number; // e.g. 1

  @IsNotEmpty()
  @IsNumber()
  toNumber: number; // e.g. 20

  @IsOptional()
  @IsString()
  zone?: string;

  @IsOptional()
  @IsString()
  cluster?: string;
}

export class AssignLockerDto {
  @IsNotEmpty()
  @IsNumber()
  lockerId: number;

  @IsNotEmpty()
  @IsNumber()
  userId: number;

  @IsOptional()
  @IsEnum(AssignmentType)
  assignmentType?: AssignmentType;

  @IsOptional()
  @IsString()
  customPin?: string;

  @IsOptional()
  @IsString()
  expiresAt?: string; // ISO datetime string

  @IsOptional()
  @IsString()
  notes?: string;
}

export class ReleaseLockerDto {
  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsNumber()
  fineAmount?: number;

  @IsOptional()
  @IsString()
  actionType?: 'NORMAL' | 'FORCED_OPEN';
}

