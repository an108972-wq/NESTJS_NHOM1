import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Locker } from './locker.entity';
import { User } from '../../users/entities/user.entity';

export enum AssignmentType {
  DAILY = 'DAILY',
  LONG_TERM = 'LONG_TERM',
}

export enum AssignmentStatus {
  ACTIVE = 'ACTIVE',
  OVERDUE = 'OVERDUE',
  RETURNED = 'RETURNED',
  FORCED_OPEN = 'FORCED_OPEN',
}

@Entity('locker_assignments')
export class LockerAssignment {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Locker, (locker) => locker.assignments, { eager: true, onDelete: 'CASCADE' })
  locker: Locker;

  @ManyToOne(() => User, { eager: true, onDelete: 'CASCADE' })
  user: User;

  @Column({
    type: 'enum',
    enum: AssignmentType,
    default: AssignmentType.DAILY,
  })
  assignmentType: AssignmentType;

  @Column({ type: 'datetime' })
  assignedAt: Date;

  @Column({ type: 'datetime' })
  expiresAt: Date;

  @Column({ type: 'datetime', nullable: true })
  returnedAt: Date;

  @Column({ length: 10, nullable: true })
  pinCode: string;

  @Column({
    type: 'enum',
    enum: AssignmentStatus,
    default: AssignmentStatus.ACTIVE,
  })
  status: AssignmentStatus;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  fineAmount: number;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

