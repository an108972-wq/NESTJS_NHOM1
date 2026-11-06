import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BorrowRecord } from '../borrow-records/entities/borrow-record.entity';
import { FinePayment } from './entities/payment.entity';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';

@Module({
  imports: [TypeOrmModule.forFeature([FinePayment, BorrowRecord])],
  controllers: [PaymentsController],
  providers: [PaymentsService],
})
export class PaymentsModule {}
