import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { BorrowRecord } from '../../borrow-records/entities/borrow-record.entity';
import { FineViolation } from '../../borrow-records/entities/fine-violation.entity';

export enum PaymentStatus {
  INITIATED = 'INITIATED',
  PAID = 'PAID',
  FAILED = 'FAILED',
}

export enum PaymentMethod {
  VNPAY = 'VNPAY',
  MANUAL = 'MANUAL',
  CASH = 'CASH',
  VIETQR = 'VIETQR',
}

@Entity('fine_payments')
@Unique(['txnRef'])
export class FinePayment {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 64 })
  txnRef: string;

  @ManyToOne(() => BorrowRecord, { nullable: true, onDelete: 'CASCADE' })
  borrowRecord: BorrowRecord | null;

  @ManyToOne(() => FineViolation, { nullable: true, onDelete: 'CASCADE' })
  violation: FineViolation | null;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  amount: number;

  @Column({ type: 'varchar', length: 20, default: PaymentStatus.INITIATED })
  status: PaymentStatus;

  @Column({ type: 'varchar', length: 10, default: PaymentMethod.VNPAY })
  paymentMethod: PaymentMethod;

  @Column({ type: 'varchar', length: 32, nullable: true })
  vnpayTransactionNo: string | null;

  @Column({ type: 'varchar', length: 4, nullable: true })
  responseCode: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @Column({ type: 'datetime', nullable: true })
  paidAt: Date | null;
}
