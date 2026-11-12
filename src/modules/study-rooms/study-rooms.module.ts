import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StudyRoom } from './entities/study-room.entity';
import { RoomBooking } from './entities/room-booking.entity';
import { RoomViolation } from './entities/room-violation.entity';
import { User } from '../users/entities/user.entity';
import { StudyRoomsService } from './study-rooms.service';
import { StudyRoomsController } from './study-rooms.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([StudyRoom, RoomBooking, RoomViolation, User]),
  ],
  controllers: [StudyRoomsController],
  providers: [StudyRoomsService],
  exports: [StudyRoomsService],
})
export class StudyRoomsModule {}

