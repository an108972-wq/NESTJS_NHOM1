import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BorrowRecord } from './entities/borrow-record.entity';
import { Book } from '../books/entities/book.entity';
import { User } from '../users/entities/user.entity';
import { BookCopy } from '../books/entities/book-copy.entity';
import { BorrowRecordsService } from './borrow-records.service';
import { BorrowRecordsController } from './borrow-records.controller';
import { ReservationsModule } from '../reservations/reservations.module';
import { FinePayment } from '../payments/entities/payment.entity';
import { SettingsModule } from '../settings/settings.module';
import { FineViolation } from './entities/fine-violation.entity';
import { FineAdjustment } from './entities/fine-adjustment.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      BorrowRecord,
      Book,
      BookCopy,
      User,
      FinePayment,
      FineViolation,
      FineAdjustment,
    ]),
    ReservationsModule,
    SettingsModule,
  ],
  providers: [BorrowRecordsService],
  controllers: [BorrowRecordsController],
})
export class BorrowRecordsModule {}