import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BookCopy } from '../books/entities/book-copy.entity';
import { Book } from '../books/entities/book.entity';
import { BorrowRecord } from '../borrow-records/entities/borrow-record.entity';
import { User } from '../users/entities/user.entity';
import { Reservation } from './entities/reservation.entity';
import { Notification } from '../notifications/entities/notification.entity';
import { ReservationsController } from './reservations.controller';
import { ReservationsService } from './reservations.service';
import { SettingsModule } from '../settings/settings.module';
import { FineViolation } from '../borrow-records/entities/fine-violation.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Reservation,
      BookCopy,
      Book,
      BorrowRecord,
      User,
      Notification,
      FineViolation,
    ]),
    SettingsModule,
  ],
  controllers: [ReservationsController],
  providers: [ReservationsService],
  exports: [ReservationsService],
})
export class ReservationsModule {}
