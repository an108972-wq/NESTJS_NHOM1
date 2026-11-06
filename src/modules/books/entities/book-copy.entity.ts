import { Column, Entity, ManyToOne, PrimaryGeneratedColumn, Unique } from 'typeorm';
import { Book } from './book.entity';

export enum BookCopyStatus {
  AVAILABLE = 'AVAILABLE',
  RESERVED = 'RESERVED',
  BORROWED = 'BORROWED',
  MAINTENANCE = 'MAINTENANCE',
  DAMAGED = 'DAMAGED',
  LOST = 'LOST',
  DISPOSED = 'DISPOSED',
}

@Entity('book_copies')
@Unique(['barcode'])
export class BookCopy {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  barcode: string;

  @Column({ type: 'enum', enum: BookCopyStatus, default: BookCopyStatus.AVAILABLE })
  status: BookCopyStatus;

  @Column({ type: 'varchar', length: 100, nullable: true })
  shelf?: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  floor?: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  aisle?: string | null;

  @ManyToOne(() => Book, (book) => book.copies, { onDelete: 'CASCADE' })
  book: Book;
}
