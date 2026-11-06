import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BooksService } from './books.service';
import { BooksController } from './books.controller';
import { Book } from './entities/book.entity';
import { BookCopy } from './entities/book-copy.entity';
import { Category } from '../categories/entities/category.entity';
import { BorrowRecord } from '../borrow-records/entities/borrow-record.entity';
import { Publisher } from '../publishers/entities/publisher.entity';
import { ReservationsModule } from '../reservations/reservations.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Book, BookCopy, Category, BorrowRecord, Publisher]),
    ReservationsModule,
  ],
  controllers: [BooksController],
  providers: [BooksService],
  exports: [TypeOrmModule, BooksService],
})
export class BooksModule {}