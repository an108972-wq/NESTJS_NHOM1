import { IsEmail, IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, Max, Min } from 'class-validator';
import { FeedbackCategory, FeedbackStatus } from '../entities/feedback.entity';

export class CreateFeedbackDto {
  @IsString()
  @IsNotEmpty()
  senderName: string;

  @IsEmail()
  @IsOptional()
  senderEmail?: string;

  @IsString()
  @IsOptional()
  senderPhone?: string;

  @IsString()
  @IsOptional()
  cardNumber?: string;

  @IsEnum(FeedbackCategory)
  @IsOptional()
  category?: FeedbackCategory;

  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  content: string;

  @IsInt()
  @Min(1)
  @Max(5)
  @IsOptional()
  rating?: number;
}

export class RespondFeedbackDto {
  @IsString()
  @IsNotEmpty()
  response: string;

  @IsEnum(FeedbackStatus)
  @IsOptional()
  status?: FeedbackStatus;
}

