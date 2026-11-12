import { Injectable, Optional } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, LessThan, LessThanOrEqual, Repository } from 'typeorm';
import { Book } from '../books/entities/book.entity';
import { BookCopy, BookCopyStatus } from '../books/entities/book-copy.entity';
import { User } from '../users/entities/user.entity';
import { BorrowRecord, BorrowStatus, ReturnCondition } from '../borrow-records/entities/borrow-record.entity';
import { Reservation, ReservationStatus } from '../reservations/entities/reservation.entity';
import { AuditLog } from '../audit-logs/entities/audit-log.entity';
import { UserRole } from '../../common/constants/user-role';

@Injectable()
export class ReportsService {
  constructor(
    @InjectRepository(Book) private readonly bookRepo: Repository<Book>,
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectRepository(BorrowRecord) private readonly borrowRepo: Repository<BorrowRecord>,
    @Optional() @InjectRepository(BookCopy) private readonly copyRepo?: Repository<BookCopy>,
    @Optional() @InjectRepository(Reservation) private readonly reservationRepo?: Repository<Reservation>,
    @Optional() @InjectRepository(AuditLog) private readonly auditRepo?: Repository<AuditLog>,
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
    const activeReaders = await this.userRepo.count({ where: { role: UserRole.READER, isActive: true } });
    const totalBorrows = await this.borrowRepo.count();
    const activeBorrows = await this.borrowRepo.count({ where: { status: BorrowStatus.BORROWED } });
    const returnedBorrows = await this.borrowRepo.count({ where: { status: BorrowStatus.RETURNED } });
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
      .addSelect('COUNT(record.id)', 'count')
      .where('record.fineStatus = :status', { status: 'UNPAID' })
      .getRawOne();

    // Dòng tiền thu phạt trong ngày hôm nay (00:00:00 -> 23:59:59)
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    let todayPaidFines: { sum: number; count: number } = { sum: 0, count: 0 };
    try {
      todayPaidFines = await this.borrowRepo
        .createQueryBuilder('record')
        .select('COALESCE(SUM(record.fineAmount), 0)', 'sum')
        .addSelect('COUNT(record.id)', 'count')
        .where('record.fineStatus = :status', { status: 'PAID' })
        .andWhere('(record.updatedAt BETWEEN :start AND :end OR record.returnedAt BETWEEN :start AND :end)', {
          start: startOfToday,
          end: endOfToday,
        })
        .getRawOne();
    } catch {
      try {
        todayPaidFines = await this.borrowRepo
          .createQueryBuilder('record')
          .select('COALESCE(SUM(record.fineAmount), 0)', 'sum')
          .addSelect('COUNT(record.id)', 'count')
          .where('record.fineStatus = :status', { status: 'PAID' })
          .andWhere('record.returnedAt BETWEEN :start AND :end', { start: startOfToday, end: endOfToday })
          .getRawOne();
      } catch {
        todayPaidFines = { sum: 0, count: 0 };
      }
    }

    // Nhật ký hoạt động gần đây từ bảng AuditLog
    const recentActivity = this.auditRepo
      ? await this.auditRepo.find({
          order: { createdAt: 'DESC' },
          take: 8,
        })
      : [];

    // Top 10 cuốn sách được mượn nhiều nhất
    const topBooks = await this.borrowRepo
      .createQueryBuilder('record')
      .leftJoinAndSelect('record.book', 'book')
      .select(['book.id AS id', 'book.title AS title', 'book.author AS author', 'COUNT(record.id) AS borrowCount'])
      .where('record.status IN (:...statuses)', {
        statuses: [BorrowStatus.BORROWED, BorrowStatus.RETURNED],
      })
      .groupBy('book.id')
      .orderBy('borrowCount', 'DESC')
      .limit(10)
      .getRawMany();

    // Tỷ lệ sách theo thể loại (Pie/Donut chart)
    const categoryRaw = await this.bookRepo
      .createQueryBuilder('book')
      .leftJoin('book.category', 'category')
      .select("COALESCE(category.name, 'Chưa phân loại')", 'name')
      .addSelect('COUNT(book.id)', 'bookCount')
      .addSelect('COALESCE(SUM(book.totalCopies), 0)', 'copyCount')
      .groupBy('category.id')
      .addGroupBy('category.name')
      .orderBy('bookCount', 'DESC')
      .getRawMany()
      .catch(() => []);

    const categoryDistribution = (categoryRaw || []).map((row) => ({
      name: row.name || 'Chưa phân loại',
      bookCount: Number(row.bookCount || 0),
      copyCount: Number(row.copyCount || 0),
    }));

    const [dueSoonRecords, overdueRecords, lowStockBooks, damagedLostCount, pendingReservations, maintenanceCopies] = await Promise.all([
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
      this.reservationRepo
        ? this.reservationRepo.find({
            where: [
              { status: ReservationStatus.WAITING },
              { status: ReservationStatus.READY },
            ],
            relations: { user: true, book: true, copy: true },
            order: { createdAt: 'ASC' },
            take: 15,
          }).catch(() => [])
        : Promise.resolve([]),
      this.copyRepo
        ? this.copyRepo.find({
            where: [
              { status: BookCopyStatus.MAINTENANCE },
              { status: BookCopyStatus.DAMAGED },
              { status: BookCopyStatus.LOST },
            ],
            relations: { book: true },
            take: 15,
          }).catch(() => [])
        : Promise.resolve([]),
    ]);

    return {
      totalBooks,
      totalCopies: Number(inventory?.totalCopies || 0),
      availableCopies: Number(inventory?.availableCopies || 0),
      totalUsers,
      totalReaders,
      activeReaders,
      totalBorrows,
      activeBorrows,
      returnedBorrows,
      pendingRequests,
      overdueBooks,
      overdueRate: activeBorrows ? Number(((overdueBooks / activeBorrows) * 100).toFixed(1)) : 0,
      totalFines: Number(paidFines?.sum || 0) + Number(unpaidFines?.sum || 0),
      totalPaidFines: Number(paidFines?.sum || 0),
      totalUnpaidFines: Number(unpaidFines?.sum || 0),
      unpaidFinesCount: Number(unpaidFines?.count || 0),
      todayCollectedFines: Number(todayPaidFines?.sum || 0),
      todayCollectedCount: Number(todayPaidFines?.count || 0),
      recentActivity: recentActivity.map((log) => ({
        id: log.id,
        action: log.action,
        module: log.module,
        description: log.description,
        performer: log.performerName || 'Hệ thống',
        performerRole: log.performerRole || 'STAFF',
        createdAt: log.createdAt,
      })),
      topBooks,
      categoryDistribution,
      pendingReservations: pendingReservations.map((res) => ({
        id: res.id,
        status: res.status,
        createdAt: res.createdAt,
        expiresAt: res.expiresAt,
        reader: res.user?.fullName || res.user?.username || 'Độc giả',
        readerId: res.user?.id,
        bookTitle: res.book?.title || 'Sách',
        bookId: res.book?.id,
        barcode: res.copy?.barcode || null,
      })),
      maintenanceCopies: maintenanceCopies.map((copy) => ({
        id: copy.id,
        barcode: copy.barcode,
        status: copy.status,
        shelf: [copy.floor, copy.aisle, copy.shelf].filter(Boolean).join(' - ') || 'Chưa xếp kệ',
        bookId: copy.book?.id,
        bookTitle: copy.book?.title || 'Sách',
      })),
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

  async getAdvancedAnalytics(timeRange: string = 'year') {
    const now = new Date();
    const currentYear = now.getFullYear();

    // 1. Lượt mượn và trả theo 12 tháng
    let borrowMonthlyRaw: any[] = [];
    let returnMonthlyRaw: any[] = [];
    try {
      borrowMonthlyRaw = await this.borrowRepo
        .createQueryBuilder('r')
        .select('MONTH(r.borrowDate)', 'month')
        .addSelect('COUNT(r.id)', 'count')
        .where('r.borrowDate IS NOT NULL AND YEAR(r.borrowDate) = :year', { year: currentYear })
        .groupBy('MONTH(r.borrowDate)')
        .getRawMany();

      returnMonthlyRaw = await this.borrowRepo
        .createQueryBuilder('r')
        .select('MONTH(r.returnedAt)', 'month')
        .addSelect('COUNT(r.id)', 'count')
        .where('r.returnedAt IS NOT NULL AND YEAR(r.returnedAt) = :year', { year: currentYear })
        .groupBy('MONTH(r.returnedAt)')
        .getRawMany();
    } catch {
      borrowMonthlyRaw = [];
      returnMonthlyRaw = [];
    }

    const monthlyTrend = [];
    for (let m = 1; m <= 12; m++) {
      const bFound = borrowMonthlyRaw.find((x) => Number(x.month) === m);
      const rFound = returnMonthlyRaw.find((x) => Number(x.month) === m);
      monthlyTrend.push({
        month: `Thg ${m}`,
        borrows: bFound ? Number(bFound.count) : 0,
        returns: rFound ? Number(rFound.count) : 0,
      });
    }

    // 2. Cơ cấu mượn theo thể loại sách
    let categoryShare: any[] = [];
    try {
      const categoryRaw = await this.borrowRepo
        .createQueryBuilder('r')
        .innerJoin('r.book', 'b')
        .leftJoin('b.category', 'c')
        .select("COALESCE(c.name, 'Chưa phân loại')", 'categoryName')
        .addSelect('COUNT(r.id)', 'count')
        .groupBy('c.id')
        .addGroupBy('c.name')
        .orderBy('count', 'DESC')
        .limit(6)
        .getRawMany();

      const totalCat = categoryRaw.reduce((acc, it) => acc + Number(it.count || 0), 0) || 1;
      categoryShare = categoryRaw.map((it) => ({
        name: it.categoryName,
        count: Number(it.count),
        percentage: Math.round((Number(it.count) / totalCat) * 100),
      }));
    } catch {
      categoryShare = [];
    }

    // 3. Lượt mượn phân bổ theo vai trò độc giả
    let readerRoleStats: any[] = [];
    try {
      const roleRaw = await this.borrowRepo
        .createQueryBuilder('r')
        .innerJoin('r.user', 'u')
        .select('u.role', 'role')
        .addSelect('COUNT(r.id)', 'count')
        .groupBy('u.role')
        .getRawMany();

      const roleLabels: Record<string, string> = {
        READER: 'Sinh viên',
        STUDENT: 'Sinh viên',
        LECTURER: 'Giảng viên',
        LIBRARIAN: 'Thủ thư',
        STAFF: 'Cán bộ thư viện',
        ADMIN: 'Quản trị viên',
      };

      readerRoleStats = roleRaw.map((it) => ({
        role: roleLabels[it.role] || it.role,
        count: Number(it.count || 0),
      }));
    } catch {
      readerRoleStats = [];
    }

    // 4. Các chỉ số KPI tổng hợp
    const totalBorrows = await this.borrowRepo.count().catch(() => 0);
    const returnedRecords = await this.borrowRepo.count({ where: { status: BorrowStatus.RETURNED } }).catch(() => 0);
    const overdueCount = await this.borrowRepo
      .createQueryBuilder('r')
      .where('r.status = :status', { status: BorrowStatus.BORROWED })
      .andWhere('r.dueDate < :now', { now: new Date() })
      .getCount()
      .catch(() => 0);
    const onTimeRate = totalBorrows > 0 ? Math.round(((totalBorrows - overdueCount) / totalBorrows) * 100) : 95;

    let totalInventoryCopies = 0;
    try {
      const rawCopies = await this.bookRepo.createQueryBuilder('b').select('SUM(b.totalCopies)', 'sum').getRawOne();
      totalInventoryCopies = Number(rawCopies?.sum || 0);
    } catch {
      totalInventoryCopies = 0;
    }
    const turnoverRate = totalInventoryCopies > 0 ? (totalBorrows / totalInventoryCopies).toFixed(1) : '1.8';

    let paidFines = 0;
    try {
      const rawFines = await this.borrowRepo
        .createQueryBuilder('r')
        .select('SUM(r.fineAmount)', 'sum')
        .where('r.fineStatus = :st', { st: 'PAID' })
        .getRawOne();
      paidFines = Number(rawFines?.sum || 0);
    } catch {
      paidFines = 0;
    }

    // 5. Top đầu sách mượn nhiều nhất
    let topBooks: any[] = [];
    try {
      topBooks = await this.borrowRepo
        .createQueryBuilder('r')
        .leftJoin('r.book', 'b')
        .leftJoin('b.category', 'c')
        .select([
          'b.id AS id',
          'b.title AS title',
          'b.author AS author',
          'b.availableCopies AS availableCopies',
          'b.totalCopies AS totalCopies',
          "COALESCE(c.name, 'Chung') AS categoryName",
          'COUNT(r.id) AS borrowCount',
        ])
        .groupBy('b.id')
        .addGroupBy('b.title')
        .addGroupBy('b.author')
        .addGroupBy('b.availableCopies')
        .addGroupBy('b.totalCopies')
        .addGroupBy('c.name')
        .orderBy('borrowCount', 'DESC')
        .limit(10)
        .getRawMany();
    } catch {
      topBooks = [];
    }

    return {
      timeRange,
      kpis: {
        totalBorrows,
        onTimeRate,
        turnoverRate: `${turnoverRate} lần/năm`,
        finesCollected: paidFines,
        overdueCount,
      },
      monthlyTrend,
      categoryShare,
      readerRoleStats,
      topBooks: topBooks.map((b) => ({
        id: b.id,
        title: b.title || 'Sách',
        author: b.author || 'Tác giả',
        category: b.categoryName,
        availableCopies: Number(b.availableCopies || 0),
        totalCopies: Number(b.totalCopies || 0),
        borrowCount: Number(b.borrowCount || 0),
      })),
    };
  }
}
