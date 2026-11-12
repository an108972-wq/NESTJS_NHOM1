import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { StudyRoom } from './study-room.entity';
import { User } from '../../users/entities/user.entity';

export enum BookingStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  CHECKED_IN = 'CHECKED_IN',
  CANCELLED = 'CANCELLED',
  NO_SHOW = 'NO_SHOW',
  COMPLETED = 'COMPLETED',
  REJECTED = 'REJECTED',
}

@Entity('room_bookings')
export class RoomBooking {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => StudyRoom, (room) => room.bookings, { eager: true, onDelete: 'CASCADE' })
  room: StudyRoom;

  @ManyToOne(() => User, { eager: true, onDelete: 'CASCADE' })
  user: User; // Đại diện nhóm đặt

  @Column({ length: 150 })
  groupName: string; // Tên nhóm / Đề tài

  @Column({ type: 'int', default: 2 })
  memberCount: number;

  @Column({ type: 'text', nullable: true })
  purpose: string; // Mục đích học tập / nghiên cứu

  @Column({ type: 'date' })
  date: string; // YYYY-MM-DD

  @Column({ length: 10 })
  startTime: string; // HH:mm

  @Column({ length: 10 })
  endTime: string; // HH:mm

  @Column({
    type: 'enum',
    enum: BookingStatus,
    default: BookingStatus.PENDING,
  })
  status: BookingStatus;

  @Column({ type: 'datetime', nullable: true })
  checkedInAt: Date;

  @Column({ type: 'text', nullable: true })
  rejectionReason: string;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

