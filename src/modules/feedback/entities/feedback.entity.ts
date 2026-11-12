import { Column, CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { User } from '../../users/entities/user.entity';

export enum FeedbackCategory {
  SERVICE_QUALITY = 'SERVICE_QUALITY',
  FACILITIES = 'FACILITIES',
  BOOK_REQUEST = 'BOOK_REQUEST',
  SYSTEM = 'SYSTEM',
  OTHER = 'OTHER',
}

export enum FeedbackStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  RESOLVED = 'RESOLVED',
  REJECTED = 'REJECTED',
}

@Entity('reader_feedback')
export class ReaderFeedback {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  user?: User | null;

  @Column({ type: 'varchar', length: 150 })
  senderName: string;

  @Column({ type: 'varchar', length: 150, nullable: true })
  senderEmail?: string | null;

  @Column({ type: 'varchar', length: 30, nullable: true })
  senderPhone?: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  cardNumber?: string | null;

  @Column({ type: 'varchar', length: 30, default: FeedbackCategory.SERVICE_QUALITY })
  category: FeedbackCategory;

  @Column()
  title: string;

  @Column({ type: 'text' })
  content: string;

  @Column({ type: 'int', default: 5 })
  rating: number;

  @Column({ type: 'varchar', length: 30, default: FeedbackStatus.PENDING })
  status: FeedbackStatus;

  @Column({ type: 'text', nullable: true })
  response?: string | null;

  @Column({ type: 'varchar', length: 150, nullable: true })
  respondedByName?: string | null;

  @Column({ type: 'datetime', nullable: true })
  respondedAt?: Date | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

