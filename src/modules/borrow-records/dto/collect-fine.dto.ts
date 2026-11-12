import { IsIn, IsOptional, IsString, Matches, MaxLength } from 'class-validator';
import { PaymentMethod } from '../../payments/entities/payment.entity';

export class CollectFineDto {
  @IsIn([PaymentMethod.CASH, PaymentMethod.VIETQR, PaymentMethod.E_WALLET])
  paymentMethod: PaymentMethod.CASH | PaymentMethod.VIETQR | PaymentMethod.E_WALLET;

  @IsOptional()
  @IsString()
  @Matches(/^[A-Za-z0-9_-]+$/)
  @MaxLength(64)
  txnRef?: string;
}
