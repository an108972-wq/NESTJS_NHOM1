import { IsBoolean, IsEmail, IsEnum, IsInt, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { TutorialCategory, TutorialFormat, TutorialStatus } from '../entities/tutorial.entity';

export class CreateTutorialDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsEnum(TutorialCategory)
  @IsOptional()
  category?: TutorialCategory;

  @IsEnum(TutorialFormat)
  @IsOptional()
  format?: TutorialFormat;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsString()
  @IsNotEmpty()
  contentUrl: string;

  @IsString()
  @IsOptional()
  thumbnailUrl?: string;

  @IsString()
  @IsOptional()
  instructor?: string;

  @IsInt()
  @IsOptional()
  durationMinutes?: number;

  @IsOptional()
  eventDate?: string | Date;

  @IsInt()
  @IsOptional()
  maxSeats?: number;

  @IsBoolean()
  @IsOptional()
  isFeatured?: boolean;

  @IsEnum(TutorialStatus)
  @IsOptional()
  status?: TutorialStatus;
}

export class UpdateTutorialDto {
  @IsString()
  @IsOptional()
  title?: string;

  @IsEnum(TutorialCategory)
  @IsOptional()
  category?: TutorialCategory;

  @IsEnum(TutorialFormat)
  @IsOptional()
  format?: TutorialFormat;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  contentUrl?: string;

  @IsString()
  @IsOptional()
  thumbnailUrl?: string;

  @IsString()
  @IsOptional()
  instructor?: string;

  @IsInt()
  @IsOptional()
  durationMinutes?: number;

  @IsOptional()
  eventDate?: string | Date;

  @IsInt()
  @IsOptional()
  maxSeats?: number;

  @IsBoolean()
  @IsOptional()
  isFeatured?: boolean;

  @IsEnum(TutorialStatus)
  @IsOptional()
  status?: TutorialStatus;
}

export class RegisterTutorialDto {
  @IsString()
  @IsNotEmpty()
  fullName: string;

  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsString()
  @IsOptional()
  cardNumber?: string;
}

