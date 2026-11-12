import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { RoomBooking } from './room-booking.entity';

export enum RoomStatus {
  ACTIVE = 'ACTIVE',
  MAINTENANCE = 'MAINTENANCE',
  LOCKED = 'LOCKED',
}

@Entity('study_rooms')
export class StudyRoom {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true, length: 50 })
  code: string; // e.g. "ROOM-301"

  @Column({ length: 150 })
  name: string; // e.g. "Phòng Thảo luận Sáng tạo 301"

  @Column({ type: 'int', default: 6 })
  capacity: number; // Sức chứa tối đa

  @Column({ type: 'text', nullable: true })
  equipment: string; // e.g. "Smart TV 65-inch, Bảng trắng kính, 4 Ổ cắm, Bút viết lông"

  @Column({
    type: 'enum',
    enum: RoomStatus,
    default: RoomStatus.ACTIVE,
  })
  status: RoomStatus;

  @Column({ length: 10, default: '08:00' })
  openingTime: string;

  @Column({ length: 10, default: '21:00' })
  closingTime: string;

  @Column({ type: 'int', default: 2 })
  maxBookingHours: number; // Tối đa 2 giờ / lượt

  @Column({ length: 100, nullable: true })
  qrToken: string; // Mã QR check-in tại cửa phòng

  @OneToMany(() => RoomBooking, (booking) => booking.room)
  bookings: RoomBooking[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

