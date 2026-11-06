import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
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

  @OneToMany(() => Book, (book) => book.publisher)
  books: Book[];
}
