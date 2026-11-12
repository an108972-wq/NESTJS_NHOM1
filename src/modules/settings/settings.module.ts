import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SettingsController } from './settings.controller';
import { LibrarySettings } from './entities/library-settings.entity';
import { SettingsService } from './settings.service';
import { User } from '../users/entities/user.entity';
import { BorrowRecord } from '../borrow-records/entities/borrow-record.entity';
import { Notification } from '../notifications/entities/notification.entity';

@Module({
  imports: [TypeOrmModule.forFeature([LibrarySettings, User, BorrowRecord, Notification])],
  controllers: [SettingsController],
  providers: [SettingsService],
  exports: [SettingsService],
})
export class SettingsModule {}
