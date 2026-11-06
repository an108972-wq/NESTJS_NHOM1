import { Type } from 'class-transformer';
import { IsInt, Min } from 'class-validator';

export class CreateStaffReservationDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  userId: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  bookId: number;
}
