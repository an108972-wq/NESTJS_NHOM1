import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Book } from '../books/entities/book.entity';
import { User } from '../users/entities/user.entity';
import { BorrowRecord } from '../borrow-records/entities/borrow-record.entity';
import { ReportsService } from './reports.service';
import { ReportsController } from './reports.controller';
import { AdminController } from './admin.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Book, User, BorrowRecord])],
  providers: [ReportsService],
  controllers: [ReportsController, AdminController],
})
export class ReportsModule {}