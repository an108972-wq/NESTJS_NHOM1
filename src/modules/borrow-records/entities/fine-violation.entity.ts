import { Column, CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { BookCopy } from '../../books/entities/book-copy.entity';
import { User } from '../../users/entities/user.entity';

export enum FineViolationType {
  DAMAGED = 'DAMAGED',
  LOST = 'LOST',
  OTHER = 'OTHER',
}

@Entity('fine_violations')
export class FineViolation {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  user: User;

  @ManyToOne(() => BookCopy, { nullable: true, onDelete: 'SET NULL' })
  copy: BookCopy | null;

  @Column({ type: 'enum', enum: FineViolationType })
  type: FineViolationType;

  @Column({ type: 'varchar', length: 255 })
  description: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  fineAmount: number;

  @Column({ type: 'varchar', length: 20, default: 'UNPAID' })
  fineStatus: string;

  @Column({ type: 'int' })
  createdById: number;

  @CreateDateColumn()
  createdAt: Date;
}
