import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany, DeleteDateColumn } from 'typeorm';
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