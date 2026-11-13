import { IsEnum, IsNumber, IsOptional, IsString } from 'class-validator';
import { ExchangeGrantType, SeminarStatus } from '../entities/academic-exchange.entity';

export class CreateSeminarDto {
  @IsString()
  title: string;

  @IsString()
  @IsOptional()
  theme?: string;

  @IsString()
  speakerNames: string;

  @IsString()
  @IsOptional()
  location?: string;

  @IsString()
  eventDate: string;

  @IsNumber()
  @IsOptional()
  durationMinutes?: number;

  @IsNumber()
  @IsOptional()
  maxSeats?: number;

  @IsEnum(SeminarStatus)
  @IsOptional()
  status?: SeminarStatus;

  @IsString()
  @IsOptional()
  description?: string;
}

export class UpdateSeminarDto {
  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  theme?: string;

  @IsString()
  @IsOptional()
  speakerNames?: string;

  @IsString()
  @IsOptional()
  location?: string;

  @IsString()
  @IsOptional()
  eventDate?: string;

  @IsNumber()
  @IsOptional()
  durationMinutes?: number;

  @IsNumber()
  @IsOptional()
  maxSeats?: number;

  @IsEnum(SeminarStatus)
  @IsOptional()
  status?: SeminarStatus;

  @IsString()
  @IsOptional()
  description?: string;
}

export class RegisterSeminarDto {
  @IsString()
  fullName: string;

  @IsString()
  email: string;

  @IsString()
  @IsOptional()
  cardNumber?: string;

  @IsString()
  @IsOptional()
  phone?: string;
}

export class CreateExchangeGrantDto {
  @IsEnum(ExchangeGrantType)
  @IsOptional()
  programType?: ExchangeGrantType;

  @IsString()
  title: string;

  @IsString()
  partnerInstitution: string;

  @IsString()
  @IsOptional()
  country?: string;

  @IsNumber()
  @IsOptional()
  bookQuantity?: number;

  @IsNumber()
  @IsOptional()
  grantAmount?: number;

  @IsNumber()
  @IsOptional()
  beneficiariesCount?: number;

  @IsString()
  @IsOptional()
  status?: string;

  @IsString()
  @IsOptional()
  note?: string;
}

export class UpdateExchangeGrantDto {
  @IsEnum(ExchangeGrantType)
  @IsOptional()
  programType?: ExchangeGrantType;

  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  partnerInstitution?: string;

  @IsString()
  @IsOptional()
  country?: string;

  @IsNumber()
  @IsOptional()
  bookQuantity?: number;

  @IsNumber()
  @IsOptional()
  grantAmount?: number;

  @IsNumber()
  @IsOptional()
  beneficiariesCount?: number;

  @IsString()
  @IsOptional()
  status?: string;

  @IsString()
  @IsOptional()
  note?: string;
}

