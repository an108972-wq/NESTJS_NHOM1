import { IsInt, IsNotEmpty, IsOptional, IsString, Max, MaxLength, Min, MinLength } from 'class-validator';
import { Transform, Type } from 'class-transformer';

export class CreateBookDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty({ message: 'Tên sách không được để trống' })
  @MinLength(2, { message: 'Tên sách phải có ít nhất 2 ký tự' })
  @MaxLength(255)
  title: string;

  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty({ message: 'Tên tác giả không được để trống' })
  @MinLength(2, { message: 'Tên tác giả phải có ít nhất 2 ký tự' })
  @MaxLength(255)
  author: string;

  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty({ message: 'Mã ISBN không được để trống' })
  isbn: string;

  @Transform(({ value }) => {
    if (value === '' || value === null || value === undefined) return undefined;
    const num = Number(value);
    return isNaN(num) ? undefined : num;
  })
  @IsOptional()
  @IsInt({ message: 'Năm xuất bản phải là số nguyên' })
  @Min(1000, { message: 'Năm xuất bản từ 1000 trở lên' })
  @Max(9999, { message: 'Năm xuất bản không hợp lệ' })
  publicationYear?: number;

  @Transform(({ value }) => (typeof value === 'string' && value.trim() === '' ? undefined : value))
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string;

  @Transform(({ value }) => (typeof value === 'string' && value.trim() === '' ? undefined : value))
  @IsOptional()
  @IsString()
  @MaxLength(2048)
  coverImageUrl?: string;

  @Transform(({ value }) => (typeof value === 'string' && value.trim() === '' ? undefined : value))
  @IsOptional()
  @IsString()
  @MaxLength(2048)
  pdfUrl?: string;

  @Transform(({ value }) => (typeof value === 'string' && value.trim() === '' ? undefined : value))
  @IsOptional()
  @IsString()
  pdfPermission?: string;

  @Transform(({ value }) => (typeof value === 'string' && value.trim() === '' ? undefined : value))
  @IsOptional()
  @IsString()
  digitalFormat?: string;

  @Transform(({ value }) => {
    if (value === '' || value === null || value === undefined) return undefined;
    const num = Number(value);
    return isNaN(num) ? undefined : num;
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  previewPages?: number;

  @Transform(({ value }) => {
    if (value === '' || value === null || value === undefined) return undefined;
    const num = Number(value);
    return isNaN(num) ? undefined : num;
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  digitalViews?: number;

  @Transform(({ value }) => {
    if (value === '' || value === null || value === undefined) return undefined;
    const num = Number(value);
    return isNaN(num) ? undefined : num;
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  digitalDownloads?: number;

  @Transform(({ value }) => {
    if (value === '' || value === null || value === undefined) return undefined;
    const num = Number(value);
    return isNaN(num) ? undefined : num;
  })
  @IsOptional()
  @Min(0)
  price?: number;

  @Transform(({ value }) => {
    if (value === '' || value === null || value === undefined) return 1;
    const num = Number(value);
    return isNaN(num) ? 1 : num;
  })
  @IsOptional()
  @IsInt({ message: 'Số bản sao phải là số nguyên' })
  @Min(1, { message: 'Số bản sao phải từ 1 trở lên' })
  totalCopies: number;

  @Transform(({ value }) => {
    if (value === '' || value === null || value === undefined) return undefined;
    const num = Number(value);
    return isNaN(num) ? undefined : num;
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  availableCopies: number;

  @Transform(({ value }) => {
    if (value === '' || value === null || value === undefined || value === 0 || value === '0') return undefined;
    const num = Number(value);
    return isNaN(num) || num <= 0 ? undefined : num;
  })
  @IsOptional()
  @IsInt({ message: 'Thể loại không hợp lệ' })
  @Min(1)
  categoryId?: number;

  @Transform(({ value }) => {
    if (value === '' || value === null || value === undefined || value === 0 || value === '0') return undefined;
    const num = Number(value);
    return isNaN(num) || num <= 0 ? undefined : num;
  })
  @IsOptional()
  @IsInt({ message: 'Nhà xuất bản không hợp lệ' })
  @Min(1)
  publisherId?: number;

  @Transform(({ value }) => (typeof value === 'string' && value.trim() === '' ? undefined : value))
  @IsOptional()
  @IsString()
  shelf?: string;

  @Transform(({ value }) => (typeof value === 'string' && value.trim() === '' ? undefined : value))
  @IsOptional()
  @IsString()
  floor?: string;

  @Transform(({ value }) => (typeof value === 'string' && value.trim() === '' ? undefined : value))
  @IsOptional()
  @IsString()
  aisle?: string;
}
