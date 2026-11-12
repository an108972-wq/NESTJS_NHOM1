import { IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';
import { RoomStatus } from '../entities/study-room.entity';
import { BookingStatus } from '../entities/room-booking.entity';

export class CreateStudyRoomDto {
  @IsNotEmpty()
  @IsString()
  code: string;

  @IsNotEmpty()
  @IsString()
  name: string;

  @IsOptional()
  @IsNumber()
  capacity?: number;

  @IsOptional()
  @IsString()
  equipment?: string;

  @IsOptional()
  @IsEnum(RoomStatus)
  status?: RoomStatus;

  @IsOptional()
  @IsString()
  openingTime?: string;

  @IsOptional()
  @IsString()
  closingTime?: string;

  @IsOptional()
  @IsNumber()
  maxBookingHours?: number;
}

export class CreateRoomBookingDto {
  @IsNotEmpty()
  @IsNumber()
  roomId: number;

  @IsNotEmpty()
  @IsString()
  groupName: string;

  @IsOptional()
  @IsNumber()
  memberCount?: number;

  @IsOptional()
  @IsString()
  purpose?: string;

  @IsNotEmpty()
  @IsString()
  date: string; // YYYY-MM-DD

  @IsNotEmpty()
  @IsString()
  startTime: string; // HH:mm

  @IsNotEmpty()
  @IsString()
  endTime: string; // HH:mm

  @IsOptional()
  @IsString()
  notes?: string;
}

export class ReviewBookingDto {
  @IsNotEmpty()
  @IsEnum([BookingStatus.APPROVED, BookingStatus.REJECTED, BookingStatus.CANCELLED])
  status: BookingStatus;

  @IsOptional()
  @IsString()
  rejectionReason?: string;
}

