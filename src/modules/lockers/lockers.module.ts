import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Locker } from './entities/locker.entity';
import { LockerAssignment } from './entities/locker-assignment.entity';
import { User } from '../users/entities/user.entity';
import { LockersService } from './lockers.service';
import { LockersController } from './lockers.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Locker, LockerAssignment, User])],
  controllers: [LockersController],
  providers: [LockersService],
  exports: [LockersService],
})
export class LockersModule {}

