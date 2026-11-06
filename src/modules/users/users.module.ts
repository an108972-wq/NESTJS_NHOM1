import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersService } from './users.service.js';
import { UsersController } from './users.controller.js';
import { User } from './entities/user.entity';
import { BorrowRecord } from '../borrow-records/entities/borrow-record.entity';
import { Reservation } from '../reservations/entities/reservation.entity';
import { SettingsModule } from '../settings/settings.module';
import { FineViolation } from '../borrow-records/entities/fine-violation.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, BorrowRecord, Reservation, FineViolation]),
    SettingsModule,
  ],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
