import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { BorrowRecord } from '../../borrow-records/entities/borrow-record.entity';
import { User } from '../../users/entities/user.entity';
import { Reservation } from '../../reservations/entities/reservation.entity';

export enum NotificationType {
  DUE_SOON = 'DUE_SOON',
  OVERDUE = 'OVERDUE',
  RESERVATION_READY = 'RESERVATION_READY',
}

export enum EmailDeliveryStatus {
  NOT_CONFIGURED = 'NOT_CONFIGURED',
  SENT = 'SENT',
  FAILED = 'FAILED',
}

@Entity('notifications')
@Unique(['user', 'borrowRecord', 'type'])
@Unique(['user', 'reservation', 'type'])
export class Notification {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  user: User;

  @ManyToOne(() => BorrowRecord, { nullable: true, onDelete: 'CASCADE' })
  borrowRecord: BorrowRecord | null;

  @ManyToOne(() => Reservation, { nullable: true, onDelete: 'CASCADE' })
  reservation: Reservation | null;

  @Column({ type: 'varchar', length: 20 })
  type: NotificationType;

  @Column({ length: 160 })
  title: string;

  @Column({ type: 'text' })
  message: string;

  @Column({ type: 'varchar', length: 20, default: EmailDeliveryStatus.NOT_CONFIGURED })
  emailStatus: EmailDeliveryStatus;

  @Column({ type: 'text', nullable: true })
  emailError: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @Column({ type: 'datetime', nullable: true })
  readAt: Date | null;
}
