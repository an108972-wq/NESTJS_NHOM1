import { IsEnum, IsNumber, IsOptional, IsString } from 'class-validator';
import {
  MultimediaCondition,
  MultimediaType,
  ThesisSecurityStatus,
} from '../entities/academic-resource.entity';

export class CreateThesisDto {
  @IsString()
  code: string;

  @IsString()
  title: string;

  @IsString()
  authorName: string;

  @IsString()
  @IsOptional()
  studentId?: string;

  @IsString()
  advisorName: string;

  @IsString()
  major: string;

  @IsNumber()
  @IsOptional()
  defenseYear?: number;

  @IsEnum(ThesisSecurityStatus)
  @IsOptional()
  securityStatus?: ThesisSecurityStatus;

  @IsString()
  @IsOptional()
  fileUrl?: string;

  @IsString()
  @IsOptional()
  abstract?: string;
}

export class UpdateThesisDto {
  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  authorName?: string;

  @IsString()
  @IsOptional()
  studentId?: string;

  @IsString()
  @IsOptional()
  advisorName?: string;

  @IsString()
  @IsOptional()
  major?: string;

  @IsNumber()
  @IsOptional()
  defenseYear?: number;

  @IsEnum(ThesisSecurityStatus)
  @IsOptional()
  securityStatus?: ThesisSecurityStatus;

  @IsString()
  @IsOptional()
  fileUrl?: string;

  @IsString()
  @IsOptional()
  abstract?: string;
}

export class CreateMultimediaDto {
  @IsString()
  code: string;

  @IsString()
  title: string;

  @IsEnum(MultimediaType)
  @IsOptional()
  type?: MultimediaType;

  @IsString()
  @IsOptional()
  location?: string;

  @IsEnum(MultimediaCondition)
  @IsOptional()
  condition?: MultimediaCondition;

  @IsNumber()
  @IsOptional()
  quantity?: number;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  digitalFileUrl?: string;
}

export class UpdateMultimediaDto {
  @IsString()
  @IsOptional()
  title?: string;

  @IsEnum(MultimediaType)
  @IsOptional()
  type?: MultimediaType;

  @IsString()
  @IsOptional()
  location?: string;

  @IsEnum(MultimediaCondition)
  @IsOptional()
  condition?: MultimediaCondition;

  @IsNumber()
  @IsOptional()
  quantity?: number;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  digitalFileUrl?: string;
}

