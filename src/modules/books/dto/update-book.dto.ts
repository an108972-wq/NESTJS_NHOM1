import { PartialType } from '@nestjs/mapped-types';
import { CreateBookDto } from './create-book.dto';
import { Transform } from 'class-transformer';
import { IsOptional } from 'class-validator';

export class UpdateBookDto extends PartialType(CreateBookDto) {
  @Transform(({ value }) => {
    if (value === '' || value === 0 || value === '0') return undefined;
    if (value === null) return null;
    const num = Number(value);
    return isNaN(num) || num <= 0 ? undefined : num;
  })
  @IsOptional()
  publisherId?: number | null;
}
