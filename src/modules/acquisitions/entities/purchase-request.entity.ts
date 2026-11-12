import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

export enum PurchaseRequestStatus {
  PENDING = 'PENDING',
  PENDING_LIBRARIAN = 'PENDING_LIBRARIAN',
  PENDING_DEAN = 'PENDING_DEAN',
  PENDING_RECTOR = 'PENDING_RECTOR',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  ORDERED = 'ORDERED',
  RECEIVED = 'RECEIVED',
}

@Entity('purchase_requests')
export class PurchaseRequest {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 255 })
  title: string;

  @Column({ length: 255 })
  author: string;

  @Column({ nullable: true, length: 150 })
  publisher?: string;

  @Column({ nullable: true, length: 50 })
  isbn?: string;

  @Column({ type: 'int', nullable: true })
  publicationYear?: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  estimatedPrice: number;

  @Column({ type: 'text', nullable: true })
  reason?: string;

  @Column({ nullable: true, length: 1024 })
  referenceUrl?: string;

  @Column({
    type: 'varchar',
    length: 50,
    default: PurchaseRequestStatus.PENDING,
  })
  status: PurchaseRequestStatus;

  @Column({ type: 'varchar', length: 30, default: 'LIBRARIAN', nullable: true })
  currentApprovalStage?: string | null; // 'LIBRARIAN' | 'DEAN' | 'RECTOR' | 'COMPLETED'

  @Column({ type: 'varchar', length: 150, nullable: true })
  librarianApprovedBy?: string | null;

  @Column({ type: 'datetime', nullable: true })
  librarianApprovedAt?: Date | null;

  @Column({ type: 'text', nullable: true })
  librarianNote?: string | null;

  @Column({ type: 'varchar', length: 150, nullable: true })
  deanApprovedBy?: string | null;

  @Column({ type: 'datetime', nullable: true })
  deanApprovedAt?: Date | null;

  @Column({ type: 'text', nullable: true })
  deanNote?: string | null;

  @Column({ type: 'varchar', length: 150, nullable: true })
  rectorApprovedBy?: string | null;

  @Column({ type: 'datetime', nullable: true })
  rectorApprovedAt?: Date | null;

  @Column({ type: 'text', nullable: true })
  rectorNote?: string | null;

  @Column({ type: 'text', nullable: true })
  rejectionReason?: string | null;

  @Column({ type: 'text', nullable: true })
  adminNote?: string;

  @Column({ type: 'int', default: 0 })
  votesCount: number;

  @ManyToOne(() => User, { nullable: false, onDelete: 'CASCADE' })
  user: User;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

