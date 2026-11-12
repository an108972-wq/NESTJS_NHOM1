import { IsInt, IsNotEmpty, IsOptional, IsString, Max, MaxLength, Min, MinLength } from 'class-validator';
import { Transform, Type } from 'class-transformer';

export class CreateBookDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty()
  @MinLength(2, { message: 'Tên sách phải có ít nhất 2 ký tự' })
  @MaxLength(255)
  title: string;

  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty()
  @MinLength(2, { message: 'Tên tác giả phải có ít nhất 2 ký tự' })
  @MaxLength(255)
  author: string;

  @IsString()
  @IsNotEmpty()
  isbn: string;

  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1000)
  @Max(9999)
  publicationYear?: number;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2048)
  coverImageUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2048)
  pdfUrl?: string;

  @IsOptional()
  @IsString()
  pdfPermission?: string;

  @IsOptional()
  @IsString()
  digitalFormat?: string;

  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  previewPages?: number;

  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(0)
  digitalViews?: number;

  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(0)
  digitalDownloads?: number;

  @Type(() => Number)
  @IsOptional()
  @Min(0)
  price?: number;

  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  totalCopies: number;

  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(0)
  availableCopies: number;

  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  categoryId?: number;

  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  publisherId?: number;

  @IsOptional()
  @IsString()
  shelf?: string;

  @IsOptional()
  @IsString()
  floor?: string;

  @IsOptional()
  @IsString()
  aisle?: string;
}
