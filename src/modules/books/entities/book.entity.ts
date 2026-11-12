import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany, DeleteDateColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { Category } from '../../categories/entities/category.entity';
import { BookCopy } from './book-copy.entity';
import { Review } from '../../reviews/entities/review.entity';
import { Publisher } from '../../publishers/entities/publisher.entity';

@Entity('books')
export class Book {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  title: string;

  @Column()
  author: string;

  @Column()
  isbn: string;

  @Column({ type: 'int', nullable: true })
  publicationYear?: number | null;

  @Column({ type: 'text', nullable: true })
  description?: string | null;

  @Column({ type: 'varchar', length: 2048, nullable: true })
  coverImageUrl?: string | null;

  @Column({ type: 'varchar', length: 2048, nullable: true })
  pdfUrl?: string | null;

  @Column({
    type: 'enum',
    enum: ['PUBLIC', 'READER_ONLY', 'NO_DOWNLOAD'],
    default: 'PUBLIC',
  })
  pdfPermission?: string;

  @Column({ type: 'varchar', length: 10, default: 'PDF' })
  digitalFormat?: string;

  @Column({ type: 'int', default: 5 })
  previewPages?: number;

  @Column({ type: 'int', default: 0 })
  digitalViews?: number;

  @Column({ type: 'int', default: 0 })
  digitalDownloads?: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 80000, nullable: true })
  price?: number | null;

  @Column({ type: 'int', default: 1 })
  totalCopies: number;

  @Column({ type: 'int', default: 1 })
  availableCopies: number;

  @Column({ nullable: true })
  shelf?: string;

  @Column({ nullable: true })
  floor?: string;

  @Column({ nullable: true })
  aisle?: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn({ nullable: true })
  deletedAt?: Date | null;

  @ManyToOne(() => Category, (category) => category.books, { nullable: true, onDelete: 'SET NULL' })
  category?: Category;

  @ManyToOne(() => Publisher, (publisher) => publisher.books, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  publisher?: Publisher;

  @OneToMany(() => BookCopy, (copy) => copy.book)
  copies: BookCopy[];

  @OneToMany(() => Review, (review) => review.book)
  reviews: Review[];
}
