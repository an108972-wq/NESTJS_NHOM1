import { IsNotEmpty, IsOptional, IsString, MaxLength, MinLength, IsNumber, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CreatePurchaseRequestDto {
  @IsString()
  @IsNotEmpty({ message: 'Tên sách không được để trống' })
  @MinLength(2)
  @MaxLength(255)
  title: string;

  @IsString()
  @IsNotEmpty({ message: 'Tên tác giả không được để trống' })
  @MinLength(2)
  @MaxLength(255)
  author: string;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  publisher?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  isbn?: string;

  @Type(() => Number)
  @IsOptional()
  @IsNumber()
  publicationYear?: number;

  @Type(() => Number)
  @IsOptional()
  @IsNumber()
  @Min(0)
  estimatedPrice?: number;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  reason?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1024)
  referenceUrl?: string;
}

