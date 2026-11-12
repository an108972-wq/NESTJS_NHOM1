import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PurchaseRequest } from './entities/purchase-request.entity';
import { PurchaseOrder } from './entities/purchase-order.entity';
import { PurchaseOrderItem } from './entities/purchase-order-item.entity';
import { LibraryBudget } from './entities/library-budget.entity';
import { PurchaseRequestVote } from './entities/purchase-request-vote.entity';
import { Book } from '../books/entities/book.entity';
import { NotificationsModule } from '../notifications/notifications.module';
import { AcquisitionsService } from './acquisitions.service';
import { AcquisitionsController } from './acquisitions.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      PurchaseRequest,
      PurchaseOrder,
      PurchaseOrderItem,
      LibraryBudget,
      PurchaseRequestVote,
      Book,
    ]),
    NotificationsModule,
  ],
  controllers: [AcquisitionsController],
  providers: [AcquisitionsService],
  exports: [AcquisitionsService],
})
export class AcquisitionsModule {}
