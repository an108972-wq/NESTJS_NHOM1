import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { BookCopyStatus } from '../entities/book-copy.entity';

export class UpdateBookCopyDto {
  @IsOptional()
  @IsEnum(BookCopyStatus)
  status?: BookCopyStatus;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  shelf?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  floor?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  aisle?: string | null;
}
