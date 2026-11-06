import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, In, LessThan, Repository } from 'typeorm';
import { BookCopy, BookCopyStatus } from '../books/entities/book-copy.entity';
import { Book } from '../books/entities/book.entity';
import { BorrowRecord, BorrowStatus } from '../borrow-records/entities/borrow-record.entity';
import { User } from '../users/entities/user.entity';
import { Reservation, ReservationStatus } from './entities/reservation.entity';
import { EmailDeliveryStatus, Notification, NotificationType } from '../notifications/entities/notification.entity';
import { UserRole } from '../../common/constants/user-role';
import { isLibraryCardExpired } from '../users/library-card';
import { SettingsService } from '../settings/settings.service';
import { FineViolation } from '../borrow-records/entities/fine-violation.entity';

@Injectable()
export class ReservationsService {
  private readonly holdHours = 24;

  constructor(
    @InjectRepository(Reservation)
    private readonly reservationRepository: Repository<Reservation>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(BorrowRecord)
    private readonly borrowRepository: Repository<BorrowRecord>,
    @InjectRepository(FineViolation)
    private readonly fineViolationRepository: Repository<FineViolation>,
    private readonly dataSource: DataSource,
    private readonly settingsService: SettingsService,
  ) {}

  async reserve(userId: number, bookId: number) {
    const unpaidFine = await this.borrowRepository.findOne({
      where: { user: { id: userId }, fineStatus: 'UNPAID' },
    });
    const unpaidManualFine = await this.fineViolationRepository.findOne({
      where: { user: { id: userId }, fineStatus: 'UNPAID' },
    });
    if (unpaidFine || unpaidManualFine) {
      throw new BadRequestException('Bạn cần thanh toán tiền phạt trước khi giữ sách');
    }

    return this.dataSource.transaction(async (manager) => {
      const user = await manager.findOne(User, {
        where: { id: userId, isActive: true },
        lock: { mode: 'pessimistic_write' },
      });
      if (!user) throw new NotFoundException('Không tìm thấy người dùng đang hoạt động');
      if (user.role === UserRole.READER && isLibraryCardExpired(user.libraryCardExpiresAt)) {
        throw new BadRequestException(
          'Thẻ thư viện đã hết hạn; vui lòng gia hạn trước khi đặt giữ sách',
        );
      }
      const book = await manager.findOne(Book, {
        where: { id: bookId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!book) throw new NotFoundException('Không tìm thấy sách');
      if (book.availableCopies > 0) {
        throw new BadRequestException('Sách vẫn còn bản sao; hãy gửi yêu cầu mượn trực tiếp');
      }

      const existing = await manager.findOne(Reservation, {
        where: {
          user: { id: userId },
          book: { id: bookId },
          status: In([ReservationStatus.WAITING, ReservationStatus.READY]),
        },
      });
      if (existing) throw new BadRequestException('Bạn đã có yêu cầu giữ sách đang hoạt động');

      const reservation = await manager.save(
        manager.create(Reservation, {
          user,
          book,
          copy: null,
          status: ReservationStatus.WAITING,
          readyAt: null,
          expiresAt: null,
        }),
      );
      return { ...reservation, user: this.publicUser(reservation.user) };
    });
  }

  async findMine(userId: number) {
    const [mine, queue] = await Promise.all([
      this.reservationRepository.find({
        where: { user: { id: userId } },
        relations: { book: true, copy: true },
        order: { createdAt: 'DESC' },
      }),
      this.reservationRepository.find({
        where: { status: ReservationStatus.WAITING },
        relations: { book: true },
        order: { createdAt: 'ASC', id: 'ASC' },
      }),
    ]);
    const bookPositions = new Map<number, number>();
    const reservationPositions = new Map<number, number>();
    queue.forEach((reservation) => {
      const position = (bookPositions.get(reservation.book.id) || 0) + 1;
      bookPositions.set(reservation.book.id, position);
      reservationPositions.set(reservation.id, position);
    });
    return mine.map((reservation) => ({
      ...reservation,
      queuePosition:
        reservation.status === ReservationStatus.WAITING
          ? reservationPositions.get(reservation.id) ?? null
          : null,
    }));
  }

  findAll() {
    return this.reservationRepository.find({
      relations: { user: true, book: true, copy: true },
      order: { createdAt: 'ASC' },
    }).then((reservations) => {
      const positions = new Map<number, number>();
      return reservations.map((reservation) => {
        let queuePosition: number | null = null;
        if (reservation.status === ReservationStatus.WAITING) {
          queuePosition = (positions.get(reservation.book.id) || 0) + 1;
          positions.set(reservation.book.id, queuePosition);
        }
        return {
          ...reservation,
          queuePosition,
          user: this.publicUser(reservation.user),
        };
      });
    });
  }

  async claim(id: number, userId: number, isStaff: boolean) {
    const result = await this.dataSource.transaction(async (manager) => {
      const reservation = await manager.findOne(Reservation, {
        where: { id },
        relations: { user: true, book: true, copy: true },
        lock: { mode: 'pessimistic_write' },
      });
      if (!reservation) throw new NotFoundException('Không tìm thấy yêu cầu giữ sách');
      if (
        reservation.user.role === UserRole.READER &&
        isLibraryCardExpired(reservation.user.libraryCardExpiresAt)
      ) {
        throw new BadRequestException('Thẻ thư viện đã hết hạn; vui lòng gia hạn trước khi nhận sách');
      }
      if (!isStaff && reservation.user.id !== userId) {
        throw new ForbiddenException('Bạn chỉ có thể nhận sách đã giữ của mình');
      }
      if (reservation.status !== ReservationStatus.READY || !reservation.copy) {
        throw new BadRequestException('Yêu cầu giữ sách chưa sẵn sàng để nhận');
      }

      if (reservation.expiresAt && reservation.expiresAt <= new Date()) {
        const copy = reservation.copy;
        reservation.status = ReservationStatus.EXPIRED;
        reservation.copy = null;
        await manager.save(reservation);
        copy.status = BookCopyStatus.AVAILABLE;
        await manager.save(copy);
        const assigned = await this.assignNextWaitingReservation(manager, reservation.book, copy);
        if (!assigned) {
          reservation.book.availableCopies += 1;
          await manager.save(reservation.book);
        }
        return { expired: true as const };
      }

      const unpaidFine = await manager.findOne(BorrowRecord, {
        where: { user: { id: reservation.user.id }, fineStatus: 'UNPAID' },
      });
      const unpaidManualFine = await manager.findOne(FineViolation, {
        where: { user: { id: reservation.user.id }, fineStatus: 'UNPAID' },
      });
      if (unpaidFine || unpaidManualFine) {
        throw new BadRequestException('Bạn cần thanh toán tiền phạt trước khi nhận sách');
      }
      const settings = await this.settingsService.getSettings();
      const activeLoanCount = await manager.count(BorrowRecord, {
        where: {
          user: { id: reservation.user.id },
          status: In([BorrowStatus.PENDING, BorrowStatus.BORROWED]),
        },
      });
      const loanLimit = Math.min(
        reservation.user.maxActiveLoans ?? settings.maxActiveLoans,
        settings.maxActiveLoans,
      );
      if (activeLoanCount >= loanLimit) {
        throw new BadRequestException(`Độc giả đã đạt giới hạn ${loanLimit} phiếu mượn đang hoạt động`);
      }

      const copy = reservation.copy;
      if (copy.status !== BookCopyStatus.RESERVED) {
        throw new BadRequestException('Bản sao không còn được giữ cho yêu cầu này');
      }
      if (!reservation.user.isActive) {
        throw new BadRequestException('Không thể giao sách cho tài khoản đã bị khóa');
      }
      let approvedAt: Date | null = null;
      let dueDate: Date | null = null;
      if (isStaff) {
        approvedAt = new Date();
        dueDate = new Date(approvedAt.getTime() + settings.borrowDays * 86_400_000);
      }
      const record = manager.create(BorrowRecord, {
        user: reservation.user,
        book: reservation.book,
        copy,
        dueDate,
        returnedAt: null,
        approvedAt,
        status: isStaff ? BorrowStatus.BORROWED : BorrowStatus.PENDING,
        fineAmount: 0,
        fineStatus: 'NONE',
        extensionCount: 0,
        returnCondition: null,
      });
      if (isStaff) {
        copy.status = BookCopyStatus.BORROWED;
        await manager.save(copy);
      }
      reservation.status = ReservationStatus.FULFILLED;
      await manager.save(reservation);
      return {
        expired: false as const,
        borrowRecord: this.publicBorrowRecord(await manager.save(record)),
      };
    });

    if (result.expired) {
      throw new BadRequestException('Thời hạn nhận sách đã hết; yêu cầu tiếp theo trong hàng đợi được xử lý');
    }
    return result.borrowRecord;
  }

  async markReady(id: number) {
    return this.dataSource.transaction(async (manager) => {
      const reservation = await manager.findOne(Reservation, {
        where: { id },
        relations: { user: true, book: true },
        lock: { mode: 'pessimistic_write' },
      });
      if (!reservation) throw new NotFoundException('Không tìm thấy yêu cầu giữ sách');
      if (reservation.status !== ReservationStatus.WAITING) {
        throw new BadRequestException('Chỉ có thể xác nhận sách cho yêu cầu đang chờ');
      }
      if (!reservation.user.isActive) {
        throw new BadRequestException('Không thể chuẩn bị sách cho tài khoản đã bị khóa');
      }
      if (
        reservation.user.role === UserRole.READER &&
        isLibraryCardExpired(reservation.user.libraryCardExpiresAt)
      ) {
        throw new BadRequestException('Thẻ thư viện đã hết hạn; vui lòng gia hạn trước khi nhận sách');
      }

      const firstWaiting = await manager.findOne(Reservation, {
        where: { book: { id: reservation.book.id }, status: ReservationStatus.WAITING },
        order: { createdAt: 'ASC', id: 'ASC' },
        lock: { mode: 'pessimistic_write' },
      });
      if (firstWaiting?.id !== reservation.id) {
        throw new BadRequestException('Cần xử lý yêu cầu đứng đầu hàng chờ trước');
      }
      const book = await manager.findOne(Book, {
        where: { id: reservation.book.id },
        lock: { mode: 'pessimistic_write' },
      });
      if (!book) throw new NotFoundException('Không tìm thấy sách');
      if (book.availableCopies <= 0) {
        throw new BadRequestException('Hiện chưa có bản sao sẵn sàng để xác nhận');
      }
      let copy = await manager.findOne(BookCopy, {
        where: { book: { id: book.id }, status: BookCopyStatus.AVAILABLE },
        lock: { mode: 'pessimistic_write' },
      });
      if (!copy) {
        const copies = manager.getRepository(BookCopy);
        const existingCopies = await copies.count({ where: { book: { id: book.id } } });
        if (existingCopies === 0) {
          const legacyCopies = Array.from({ length: book.totalCopies }, (_, index) =>
            copies.create({
              book,
              barcode: `LEGACY-${book.id}-${index + 1}`,
              status:
                index < book.availableCopies
                  ? BookCopyStatus.AVAILABLE
                  : BookCopyStatus.BORROWED,
            }),
          );
          await copies.save(legacyCopies);
          copy = await copies.findOne({
            where: { book: { id: book.id }, status: BookCopyStatus.AVAILABLE },
            lock: { mode: 'pessimistic_write' },
          });
        }
      }
      if (!copy) throw new BadRequestException('Không tìm thấy bản sao sẵn sàng trong kho');

      const readyAt = new Date();
      copy.status = BookCopyStatus.RESERVED;
      book.availableCopies -= 1;
      reservation.status = ReservationStatus.READY;
      reservation.copy = copy;
      reservation.readyAt = readyAt;
      reservation.expiresAt = new Date(readyAt.getTime() + this.holdHours * 60 * 60 * 1000);
      await manager.save(copy);
      await manager.save(book);
      const saved = await manager.save(reservation);
      await this.createReadyNotification(manager, reservation, book);
      return { ...saved, user: this.publicUser(saved.user) };
    });
  }

  async cancel(id: number, userId: number, isStaff: boolean) {
    return this.dataSource.transaction(async (manager) => {
      const reservation = await manager.findOne(Reservation, {
        where: { id },
        relations: { user: true, book: true, copy: true },
        lock: { mode: 'pessimistic_write' },
      });
      if (!reservation) throw new NotFoundException('Không tìm thấy yêu cầu giữ sách');
      if (!isStaff && reservation.user.id !== userId) {
        throw new ForbiddenException('Bạn chỉ có thể hủy yêu cầu giữ sách của mình');
      }
      if (![ReservationStatus.WAITING, ReservationStatus.READY].includes(reservation.status)) {
        throw new BadRequestException('Chỉ có thể hủy yêu cầu đang chờ hoặc sẵn sàng');
      }

      reservation.status = ReservationStatus.CANCELLED;
      if (reservation.copy) {
        const copy = reservation.copy;
        reservation.copy = null;
        await manager.save(reservation);
        copy.status = BookCopyStatus.AVAILABLE;
        await manager.save(copy);
        const assigned = await this.assignNextWaitingReservation(manager, reservation.book, copy);
        if (!assigned) {
          reservation.book.availableCopies += 1;
          await manager.save(reservation.book);
        }
      }
      const saved = await manager.save(reservation);
      return { ...saved, user: this.publicUser(saved.user) };
    });
  }

  async expireReadyReservations() {
    const expired = await this.reservationRepository.find({
      where: { status: ReservationStatus.READY, expiresAt: LessThan(new Date()) },
    });
    for (const candidate of expired) {
      await this.dataSource.transaction(async (manager) => {
        const reservation = await manager.findOne(Reservation, {
          where: { id: candidate.id },
          relations: { book: true, copy: true },
          lock: { mode: 'pessimistic_write' },
        });
        if (
          !reservation ||
          reservation.status !== ReservationStatus.READY ||
          !reservation.copy ||
          !reservation.expiresAt ||
          reservation.expiresAt > new Date()
        ) {
          return;
        }
        const copy = reservation.copy;
        reservation.status = ReservationStatus.EXPIRED;
        reservation.copy = null;
        await manager.save(reservation);
        copy.status = BookCopyStatus.AVAILABLE;
        await manager.save(copy);
        const assigned = await this.assignNextWaitingReservation(manager, reservation.book, copy);
        if (!assigned) {
          reservation.book.availableCopies += 1;
          await manager.save(reservation.book);
        }
      });
    }
  }

  async assignNextWaitingReservation(
    manager: EntityManager,
    book: Book,
    copy: BookCopy,
  ): Promise<boolean> {
    const today = new Date().toISOString().slice(0, 10);
    const next = await manager
      .createQueryBuilder(Reservation, 'reservation')
      .innerJoin('reservation.book', 'book')
      .leftJoinAndSelect('reservation.user', 'user')
      .where('book.id = :bookId', { bookId: book.id })
      .andWhere('reservation.status = :status', { status: ReservationStatus.WAITING })
      .andWhere('user.isActive = :isActive', { isActive: true })
      .andWhere(
        '(user.role != :readerRole OR user.libraryCardExpiresAt IS NULL OR user.libraryCardExpiresAt >= :today)',
        { readerRole: UserRole.READER, today },
      )
      .orderBy('reservation.createdAt', 'ASC')
      .addOrderBy('reservation.id', 'ASC')
      .setLock('pessimistic_write')
      .getOne();
    if (!next) return false;

    const readyAt = new Date();
    const expiresAt = new Date(readyAt.getTime() + this.holdHours * 60 * 60 * 1000);
    next.status = ReservationStatus.READY;
    next.copy = copy;
    next.readyAt = readyAt;
    next.expiresAt = expiresAt;
    copy.status = BookCopyStatus.RESERVED;
    await manager.save(copy);
    await manager.save(next);
    await this.createReadyNotification(manager, next, book);
    return true;
  }

  private async createReadyNotification(manager: EntityManager, reservation: Reservation, book: Book) {
    await manager.save(
      Notification,
      manager.create(Notification, {
        user: reservation.user,
        borrowRecord: null,
        reservation,
        type: NotificationType.RESERVATION_READY,
        title: 'Sách bạn đặt giữ đã sẵn sàng',
        message: `Sách "${book.title}" đã có bản sao dành cho bạn. Vui lòng nhận trước ${reservation.expiresAt?.toLocaleString('vi-VN')}.`,
        emailStatus: EmailDeliveryStatus.NOT_CONFIGURED,
        emailError: null,
        readAt: null,
      }),
    );
  }

  private publicUser(user: User) {
    if (!user) return user;
    return {
      id: user.id,
      username: user.username,
      fullName: user.fullName,
      phone: user.phone,
      email: user.email,
      role: user.role,
    };
  }

  private publicBorrowRecord(record: BorrowRecord) {
    return { ...record, user: this.publicUser(record.user) };
  }
}
