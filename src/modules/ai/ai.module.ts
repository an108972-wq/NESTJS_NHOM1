import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';
import { Book } from '../books/entities/book.entity';
import { Category } from '../categories/entities/category.entity';
import { BorrowRecord } from '../borrow-records/entities/borrow-record.entity';
import { FavoriteBook } from '../books/entities/favorite-book.entity';
import { User } from '../users/entities/user.entity';
import { PurchaseRequest } from '../acquisitions/entities/purchase-request.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Book,
      Category,
      BorrowRecord,
      FavoriteBook,
      User,
      PurchaseRequest,
    ]),
  ],
  controllers: [AiController],
  providers: [AiService],
  exports: [AiService],
})
export class AiModule {}

