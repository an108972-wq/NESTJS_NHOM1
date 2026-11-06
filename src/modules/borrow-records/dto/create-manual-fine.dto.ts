import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { FineViolationType } from '../entities/fine-violation.entity';

export class CreateManualFineDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  userId: number;

  @IsEnum(FineViolationType)
  type: FineViolationType;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  description: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(1_000_000)
  fineAmount: number;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  barcode?: string;
}
