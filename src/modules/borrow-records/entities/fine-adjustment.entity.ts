import { Column, CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { BorrowRecord } from './borrow-record.entity';
import { FineViolation } from './fine-violation.entity';

@Entity('fine_adjustments')
export class FineAdjustment {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => BorrowRecord, { nullable: true, onDelete: 'CASCADE' })
  borrowRecord: BorrowRecord | null;

  @ManyToOne(() => FineViolation, { nullable: true, onDelete: 'CASCADE' })
  violation: FineViolation | null;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  amount: number;

  @Column({ type: 'varchar', length: 255 })
  reason: string;

  @Column({ type: 'int' })
  createdById: number;

  @CreateDateColumn()
  createdAt: Date;
}
