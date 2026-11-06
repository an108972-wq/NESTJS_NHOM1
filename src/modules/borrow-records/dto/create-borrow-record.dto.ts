import { Type } from 'class-transformer';
import {
  IsEnum,
  IsArray,
  ArrayMaxSize,
  ArrayNotEmpty,
  ArrayUnique,
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { ReturnCondition } from '../entities/borrow-record.entity';

export class ReturnBorrowRecordDto {
  @IsEnum(ReturnCondition)
  condition: ReturnCondition;

  @IsOptional()
  @IsBoolean()
  collectFineAtCounter?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(1_000_000)
  damageFineAmount?: number;
}

export class StaffBarcodeBorrowDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  userId: number;

  @IsString()
  @IsNotEmpty()
  barcode: string;
}

export class StaffBarcodeBorrowBatchDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  userId: number;

  @IsArray()
  @ArrayNotEmpty()
  @ArrayMaxSize(50)
  @ArrayUnique()
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  barcodes: string[];
}
