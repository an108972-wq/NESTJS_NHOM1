import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('library_budgets')
export class LibraryBudget {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true, type: 'int' })
  year: number;

  @Column({ type: 'decimal', precision: 14, scale: 2, default: 0 })
  totalBudget: number;

  @Column({ type: 'decimal', precision: 14, scale: 2, default: 0 })
  q1Allocation: number;

  @Column({ type: 'decimal', precision: 14, scale: 2, default: 0 })
  q2Allocation: number;

  @Column({ type: 'decimal', precision: 14, scale: 2, default: 0 })
  q3Allocation: number;

  @Column({ type: 'decimal', precision: 14, scale: 2, default: 0 })
  q4Allocation: number;

  @Column({ type: 'text', nullable: true })
  notes?: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

