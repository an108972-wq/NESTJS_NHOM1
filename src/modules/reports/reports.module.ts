import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Book } from '../books/entities/book.entity';
import { BookCopy } from '../books/entities/book-copy.entity';
import { User } from '../users/entities/user.entity';
import { BorrowRecord } from '../borrow-records/entities/borrow-record.entity';
import { Reservation } from '../reservations/entities/reservation.entity';
import { AuditLog } from '../audit-logs/entities/audit-log.entity';
import { ReportsService } from './reports.service';
import { ReportsController } from './reports.controller';
import { AdminController } from './admin.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Book, BookCopy, User, BorrowRecord, Reservation, AuditLog])],
  providers: [ReportsService],
  controllers: [ReportsController, AdminController],
})
export class ReportsModule { }
