import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Book } from '../books/entities/book.entity';
import { User } from '../users/entities/user.entity';
import { BorrowRecord } from '../borrow-records/entities/borrow-record.entity';

@Injectable()
export class ReportsService {
  constructor(
    @InjectRepository(Book) private readonly bookRepo: Repository<Book>,
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectRepository(BorrowRecord) private readonly borrowRepo: Repository<BorrowRecord>,
  ) {}

  async getDashboardStats() {
    const totalBooks = await this.bookRepo.count();
    const totalUsers = await this.userRepo.count();
    const totalBorrows = await this.borrowRepo.count();
    const activeBorrows = await this.borrowRepo.count({ where: { status: 'BORROWED' } });

    // Tính tổng tiền phạt đã thu (PAID) và chưa thu (UNPAID)
    const paidFines = await this.borrowRepo
      .createQueryBuilder('record')
      .select('SUM(record.fineAmount)', 'sum')
      .where('record.fineStatus = :status', { status: 'PAID' })
      .getRawOne();

    const unpaidFines = await this.borrowRepo
      .createQueryBuilder('record')
      .select('SUM(record.fineAmount)', 'sum')
      .where('record.fineStatus = :status', { status: 'UNPAID' })
      .getRawOne();

    // Top 5 cuốn sách được mượn nhiều nhất
    const topBooks = await this.borrowRepo
      .createQueryBuilder('record')
      .leftJoinAndSelect('record.book', 'book')
      .select(['book.id AS id', 'book.title AS title', 'book.author AS author', 'COUNT(record.id) AS borrowCount'])
      .groupBy('book.id')
      .orderBy('borrowCount', 'DESC')
      .limit(5)
      .getRawMany();

    return {
      totalBooks,
      totalUsers,
      totalBorrows,
      activeBorrows,
      totalPaidFines: Number(paidFines?.sum || 0),
      totalUnpaidFines: Number(unpaidFines?.sum || 0),
      topBooks,
    };
  }
}