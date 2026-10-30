import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BorrowRecord } from './entities/borrow-record.entity';
import { Book } from '../books/entities/book.entity';
import { User } from '../users/entities/user.entity';
import { BorrowRecordsService } from './borrow-records.service';
import { BorrowRecordsController } from './borrow-records.controller';

@Module({
  imports: [TypeOrmModule.forFeature([BorrowRecord, Book, User])],
  providers: [BorrowRecordsService],
  controllers: [BorrowRecordsController],
})
export class BorrowRecordsModule {}