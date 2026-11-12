import { IsEnum, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { DonationType, PartnerType } from '../entities/partner.entity';

export class CreatePartnerDto {
  @IsString()
  name: string;

  @IsEnum(PartnerType)
  @IsOptional()
  type?: PartnerType;

  @IsString()
  @IsOptional()
  contactPerson?: string;

  @IsString()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsString()
  @IsOptional()
  address?: string;

  @IsString()
  @IsOptional()
  status?: string;

  @IsString()
  @IsOptional()
  note?: string;
}

export class UpdatePartnerDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsEnum(PartnerType)
  @IsOptional()
  type?: PartnerType;

  @IsString()
  @IsOptional()
  contactPerson?: string;

  @IsString()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsString()
  @IsOptional()
  address?: string;

  @IsString()
  @IsOptional()
  status?: string;

  @IsString()
  @IsOptional()
  note?: string;
}

export class CreateDonationDto {
  @IsNumber()
  partnerId: number;

  @IsEnum(DonationType)
  @IsOptional()
  donationType?: DonationType;

  @IsString()
  itemTitle: string;

  @IsNumber()
  @Min(1)
  @IsOptional()
  quantity?: number;

  @IsNumber()
  @IsOptional()
  estimatedValue?: number;

  @IsString()
  @IsOptional()
  note?: string;
}

