import { IsBoolean, IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { EventStatus, EventType, TargetAudience } from '../entities/library-event.entity';

export class CreateEventDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsEnum(EventType)
  @IsOptional()
  type?: EventType;

  @IsString()
  @IsNotEmpty()
  content: string;

  @IsString()
  @IsOptional()
  location?: string;

  @IsOptional()
  startDate?: string | Date;

  @IsOptional()
  endDate?: string | Date;

  @IsString()
  @IsOptional()
  bannerUrl?: string;

  @IsBoolean()
  @IsOptional()
  isPinned?: boolean;

  @IsEnum(TargetAudience)
  @IsOptional()
  targetAudience?: TargetAudience;

  @IsEnum(EventStatus)
  @IsOptional()
  status?: EventStatus;
}

export class UpdateEventDto {
  @IsString()
  @IsOptional()
  title?: string;

  @IsEnum(EventType)
  @IsOptional()
  type?: EventType;

  @IsString()
  @IsOptional()
  content?: string;

  @IsString()
  @IsOptional()
  location?: string;

  @IsOptional()
  startDate?: string | Date;

  @IsOptional()
  endDate?: string | Date;

  @IsString()
  @IsOptional()
  bannerUrl?: string;

  @IsBoolean()
  @IsOptional()
  isPinned?: boolean;

  @IsEnum(TargetAudience)
  @IsOptional()
  targetAudience?: TargetAudience;

  @IsEnum(EventStatus)
  @IsOptional()
  status?: EventStatus;
}

export class BroadcastEventDto {
  @IsEnum(TargetAudience)
  @IsOptional()
  targetAudience?: TargetAudience;

  @IsString()
  @IsOptional()
  messagePrefix?: string;
}

