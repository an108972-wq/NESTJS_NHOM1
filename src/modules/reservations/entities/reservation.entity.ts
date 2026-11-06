import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { BookCopy } from '../../books/entities/book-copy.entity';
import { Book } from '../../books/entities/book.entity';
import { User } from '../../users/entities/user.entity';

export enum ReservationStatus {
  WAITING = 'WAITING',
  READY = 'READY',
  FULFILLED = 'FULFILLED',
  CANCELLED = 'CANCELLED',
  EXPIRED = 'EXPIRED',
}

@Entity('reservations')
export class Reservation {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  user: User;

  @ManyToOne(() => Book, { onDelete: 'CASCADE' })
  book: Book;

  @ManyToOne(() => BookCopy, { nullable: true, onDelete: 'SET NULL' })
  copy: BookCopy | null;

  @Column({ type: 'varchar', length: 20, default: ReservationStatus.WAITING })
  status: ReservationStatus;

  @CreateDateColumn()
  createdAt: Date;

  @Column({ type: 'datetime', nullable: true })
  readyAt: Date | null;

  @Column({ type: 'datetime', nullable: true })
  expiresAt: Date | null;
}
