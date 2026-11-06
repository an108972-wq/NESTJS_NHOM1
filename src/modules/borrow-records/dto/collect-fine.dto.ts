import { IsIn, IsOptional, IsString, Matches, MaxLength } from 'class-validator';
import { PaymentMethod } from '../../payments/entities/payment.entity';

export class CollectFineDto {
  @IsIn([PaymentMethod.CASH, PaymentMethod.VIETQR])
  paymentMethod: PaymentMethod.CASH | PaymentMethod.VIETQR;

  @IsOptional()
  @IsString()
  @Matches(/^[A-Za-z0-9_-]+$/)
  @MaxLength(64)
  txnRef?: string;
}
