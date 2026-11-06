import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Book } from '../../books/entities/book.entity';
import { BookCopy } from '../../books/entities/book-copy.entity';

export enum BorrowStatus {
  PENDING = 'PENDING',
  BORROWED = 'BORROWED',
  RETURNED = 'RETURNED',
  REJECTED = 'REJECTED',
}

export enum ReturnCondition {
  NORMAL = 'NORMAL',
  DAMAGED = 'DAMAGED',
  LIGHT_DAMAGE = 'LIGHT_DAMAGE',
  SEVERE_DAMAGE = 'SEVERE_DAMAGE',
  LOST = 'LOST',
}

@Entity('borrow_records')
export class BorrowRecord {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  user: User;

  @ManyToOne(() => Book, { onDelete: 'CASCADE' })
  book: Book;

  @ManyToOne(() => BookCopy, { nullable: true, onDelete: 'SET NULL' })
  copy: BookCopy | null;

  @CreateDateColumn()
  borrowedAt: Date;

  @Column({ type: 'datetime', nullable: true })
  dueDate: Date | null;

  @Column({ type: 'datetime', nullable: true })
  returnedAt: Date | null;

  @Column({ type: 'enum', enum: BorrowStatus, default: BorrowStatus.PENDING })
  status: BorrowStatus;

  @Column({ type: 'datetime', nullable: true })
  approvedAt: Date | null;

  @Column({ type: 'int', default: 0 })
  extensionCount: number;

  @Column({ type: 'enum', enum: ReturnCondition, nullable: true })
  returnCondition: ReturnCondition | null;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  fineAmount: number;

  @Column({ default: 'NONE' }) // NONE | UNPAID | PAID
  fineStatus: string;
}