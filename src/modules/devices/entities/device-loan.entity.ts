import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Device } from './device.entity';
import { User } from '../../users/entities/user.entity';

export enum DeviceLoanStatus {
  ACTIVE = 'ACTIVE',
  RETURNED = 'RETURNED',
  OVERDUE = 'OVERDUE',
  DAMAGED = 'DAMAGED',
}

export enum DeviceLoanType {
  HOURLY = 'HOURLY',
  DAILY = 'DAILY',
}

@Entity('device_loans')
export class DeviceLoan {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Device, (device) => device.loans, { eager: true, onDelete: 'CASCADE' })
  device: Device;

  @ManyToOne(() => User, { eager: true, onDelete: 'CASCADE' })
  user: User;

  @Column({
    type: 'enum',
    enum: DeviceLoanType,
    default: DeviceLoanType.HOURLY,
  })
  loanType: DeviceLoanType;

  @Column({ type: 'datetime' })
  borrowedAt: Date;

  @Column({ type: 'datetime' })
  expectedReturnAt: Date;

  @Column({ type: 'datetime', nullable: true })
  returnedAt: Date;

  @Column({ type: 'text', nullable: true })
  preCondition: string; // Tình trạng khi giao: "Pin 100%, không trầy xước, đủ sạc cáp"

  @Column({ type: 'text', nullable: true })
  postCondition: string; // Tình trạng khi trả: "Hoạt động tốt, nguyên vẹn"

  @Column({ default: true })
  accessoriesChecked: boolean;

  @Column({
    type: 'enum',
    enum: DeviceLoanStatus,
    default: DeviceLoanStatus.ACTIVE,
  })
  status: DeviceLoanStatus;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  fineAmount: number;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

