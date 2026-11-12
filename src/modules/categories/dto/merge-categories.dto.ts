import { IsArray, ArrayNotEmpty, IsInt, IsOptional, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';

export class MergeCategoriesDto {
  @IsArray()
  @ArrayNotEmpty()
  @Type(() => Number)
  @IsInt({ each: true })
  sourceCategoryIds: number[];

  @IsInt()
  @Type(() => Number)
  targetCategoryId: number;

  @IsOptional()
  @IsBoolean()
  deleteSourceCategories?: boolean;
}

