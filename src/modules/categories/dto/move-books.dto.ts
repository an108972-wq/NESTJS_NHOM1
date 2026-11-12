import { IsInt } from 'class-validator';
import { Type } from 'class-transformer';

export class MoveBooksCategoryDto {
  @IsInt()
  @Type(() => Number)
  targetCategoryId: number;
}

