import { IsBoolean } from 'class-validator';

export class ModerateReviewDto {
  @IsBoolean()
  isVisible: boolean;
}
