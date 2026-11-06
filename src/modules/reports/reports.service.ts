import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, LessThan, LessThanOrEqual, Repository } from 'typeorm';
import { Book } from '../books/entities/book.entity';
import { User } from '../users/entities/user.entity';
import { BorrowRecord, BorrowStatus, ReturnCondition } from '../borrow-records/entities/borrow-record.entity';
import { UserRole } from '../../common/constants/user-role';

@Injectable()
export class ReportsService {
  constructor(
    @InjectRepository(Book) private readonly bookRepo: Repository<Book>,
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectRepository(BorrowRecord) private readonly borrowRepo: Repository<BorrowRecord>,
  ) {}

  async getDashboardStats() {
    const now = new Date();
    const dueSoonCutoff = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
    const totalBooks = await this.bookRepo.count();
    const inventory = await this.bookRepo
      .createQueryBuilder('book')
      .select('COALESCE(SUM(book.totalCopies), 0)', 'totalCopies')
      .addSelect('COALESCE(SUM(book.availableCopies), 0)', 'availableCopies')
      .getRawOne();
    const totalUsers = await this.userRepo.count();
    const totalReaders = await this.userRepo.count({ where: { role: UserRole.READER } });
    const totalBorrows = await this.borrowRepo.count();
    const activeBorrows = await this.borrowRepo.count({ where: { status: BorrowStatus.BORROWED } });
    const pendingRequests = await this.borrowRepo.count({ where: { status: BorrowStatus.PENDING } });
    const overdueBooks = await this.borrowRepo
      .createQueryBuilder('record')
      .where('record.status = :status', { status: BorrowStatus.BORROWED })
      .andWhere('record.dueDate < :now', { now: new Date() })
      .getCount();

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
      .where('record.status IN (:...statuses)', {
        statuses: [BorrowStatus.BORROWED, BorrowStatus.RETURNED],
      })
      .groupBy('book.id')
      .orderBy('borrowCount', 'DESC')
      .limit(5)
      .getRawMany();
    const [dueSoonRecords, overdueRecords, lowStockBooks, damagedLostCount] = await Promise.all([
      this.borrowRepo.find({
        where: { status: BorrowStatus.BORROWED, dueDate: Between(now, dueSoonCutoff) },
        relations: { user: true, book: true },
        order: { dueDate: 'ASC' },
      }),
      this.borrowRepo.find({
        where: { status: BorrowStatus.BORROWED, dueDate: LessThan(now) },
        relations: { user: true, book: true },
        order: { dueDate: 'ASC' },
      }),
      this.bookRepo.find({
        where: { availableCopies: LessThanOrEqual(1) },
        order: { availableCopies: 'ASC', title: 'ASC' },
        take: 10,
      }),
      this.borrowRepo.count({
        where: [
          { returnCondition: ReturnCondition.DAMAGED },
          { returnCondition: ReturnCondition.LOST },
        ],
      }),
    ]);

    return {
      totalBooks,
      totalCopies: Number(inventory?.totalCopies || 0),
      availableCopies: Number(inventory?.availableCopies || 0),
      totalUsers,
      totalReaders,
      totalBorrows,
      activeBorrows,
      pendingRequests,
      overdueBooks,
      overdueRate: activeBorrows ? Number(((overdueBooks / activeBorrows) * 100).toFixed(1)) : 0,
      totalFines: Number(paidFines?.sum || 0) + Number(unpaidFines?.sum || 0),
      totalPaidFines: Number(paidFines?.sum || 0),
      totalUnpaidFines: Number(unpaidFines?.sum || 0),
      topBooks,
      alerts: {
        dueSoon: dueSoonRecords.map((record) => ({
          recordId: record.id,
          reader: record.user?.username || 'Độc giả',
          book: record.book?.title || 'Sách',
          dueDate: record.dueDate,
        })),
        overdue: overdueRecords.map((record) => ({
          recordId: record.id,
          reader: record.user?.username || 'Độc giả',
          book: record.book?.title || 'Sách',
          dueDate: record.dueDate,
        })),
        lowStock: lowStockBooks.map((book) => ({
          id: book.id,
          title: book.title,
          availableCopies: book.availableCopies,
        })),
        damagedLostCount,
      },
    };
  }
}