import { Type } from 'class-transformer';
import { IsInt, IsNotEmpty, IsString, Max, MaxLength, Min, MinLength } from 'class-validator';

export class WaiveFineDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(1_000_000)
  amount: number;

  @IsString()
  @IsNotEmpty()
  @MinLength(5)
  @MaxLength(255)
  reason: string;
}
