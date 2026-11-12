import { Column, CreateDateColumn, Entity, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { Book } from '../../books/entities/book.entity';

@Entity('publishers')
export class Publisher {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true, length: 150 })
  name: string;

  @Column({ nullable: true, length: 150 })
  email?: string;

  @Column({ nullable: true, length: 30 })
  phone?: string;

  @Column({ nullable: true, length: 255 })
  address?: string;

  @Column({ nullable: true, length: 500 })
  website?: string;

  @Column({ nullable: true, length: 100 })
  contactPerson?: string;

  @Column({ nullable: true, length: 50 })
  taxCode?: string;

  @Column({ type: 'int', default: 5, nullable: true })
  qualityRating?: number;

  @Column({ type: 'varchar', length: 50, default: 'ON_TIME', nullable: true })
  deliverySpeed?: string;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0, nullable: true })
  discountRate?: number;

  @Column({ type: 'text', nullable: true })
  reputationNotes?: string;

  @Column({ nullable: true, length: 500 })
  logoUrl?: string;

  @OneToMany(() => Book, (book) => book.publisher)
  books: Book[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
