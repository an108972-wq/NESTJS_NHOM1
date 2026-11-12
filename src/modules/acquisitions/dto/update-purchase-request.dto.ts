import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { PurchaseRequestStatus } from '../entities/purchase-request.entity';

export class UpdatePurchaseRequestDto {
  @IsOptional()
  @IsEnum(PurchaseRequestStatus)
  status?: PurchaseRequestStatus;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  adminNote?: string;
}

