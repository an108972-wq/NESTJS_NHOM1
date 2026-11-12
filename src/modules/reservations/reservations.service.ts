import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  OnModuleInit,
  OnModuleDestroy,
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
import { createTransport } from 'nodemailer';

@Injectable()
export class ReservationsService implements OnModuleInit, OnModuleDestroy {
  private readonly holdHours = 24;
  private autoExpireTimer?: NodeJS.Timeout;

  onModuleInit() {
    this.autoExpireTimer = setInterval(() => {
      void this.expireReadyReservations();
    }, 10 * 60 * 1000);
    this.autoExpireTimer.unref();
    setTimeout(() => void this.expireReadyReservations(), 15000);
  }

  onModuleDestroy() {
    if (this.autoExpireTimer) clearInterval(this.autoExpireTimer);
  }

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
  ) { }

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

  async findAll() {
    const reservations = await this.reservationRepository.find({
      relations: { user: true, book: true, copy: true },
      order: { createdAt: 'ASC' },
    });
    const positions = new Map<number, number>();
    const notifRepo = this.dataSource.getRepository(Notification);
    const readyNotifs = await notifRepo.find({
      where: { type: NotificationType.RESERVATION_READY },
      relations: { reservation: true },
      order: { createdAt: 'DESC' },
    });
    const notifMap = new Map<number, Notification>();
    for (const n of readyNotifs) {
      if (n.reservation && !notifMap.has(n.reservation.id)) {
        notifMap.set(n.reservation.id, n);
      }
    }

    return reservations.map((reservation) => {
      let queuePosition: number | null = null;
      if (reservation.status === ReservationStatus.WAITING) {
        queuePosition = (positions.get(reservation.book.id) || 0) + 1;
        positions.set(reservation.book.id, queuePosition);
      }
      const notif = notifMap.get(reservation.id);
      return {
        ...reservation,
        queuePosition,
        emailStatus: notif?.emailStatus || null,
        emailError: notif?.emailError || null,
        user: this.publicUser(reservation.user),
      };
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
      setTimeout(() => {
        try {
          void this.sendReadyEmail(reservation.id).catch(() => {});
        } catch {}
      }, 200);
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
    let count = 0;
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
        count++;
      });
    }
    return {
      message: 'Kiểm tra thời gian giữ chỗ hoàn tất',
      expiredCount: count,
    };
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
    setTimeout(() => {
      try {
        void this.sendReadyEmail(next.id).catch(() => {});
      } catch {}
    }, 200);
    return true;
  }

  async sendReadyEmail(reservationId: number): Promise<{ success: boolean; message: string }> {
    if (!this.reservationRepository || typeof this.reservationRepository.findOne !== 'function') {
      return { success: false, message: 'Repository not ready' };
    }
    const reservation = await this.reservationRepository.findOne({
      where: { id: reservationId },
      relations: { user: true, book: true, copy: true },
    });
    if (!reservation) {
      throw new NotFoundException('Không tìm thấy yêu cầu giữ sách');
    }
    if (reservation.status !== ReservationStatus.READY) {
      throw new BadRequestException('Chỉ có thể gửi email thông báo khi yêu cầu giữ sách đang ở trạng thái READY');
    }

    const user = reservation.user;
    if (!user || !user.email) {
      return { success: false, message: 'Độc giả chưa có địa chỉ email để nhận thông báo' };
    }

    const notifRepo = this.dataSource.getRepository(Notification);
    let notif = await notifRepo.findOne({
      where: { reservation: { id: reservation.id }, type: NotificationType.RESERVATION_READY },
      order: { createdAt: 'DESC' },
    });

    const formattedExpiry = reservation.expiresAt
      ? new Intl.DateTimeFormat('vi-VN', {
          dateStyle: 'medium',
          timeStyle: 'short',
          timeZone: 'Asia/Ho_Chi_Minh',
        }).format(reservation.expiresAt)
      : 'sau 24 giờ';

    const shelfLocation = [
      reservation.copy?.shelf && `Kệ ${reservation.copy.shelf}`,
      reservation.copy?.floor && `Tầng ${reservation.copy.floor}`,
      reservation.copy?.aisle,
    ].filter(Boolean).join(' · ') || 'Kệ giữ chỗ đặt trước tại quầy thư viện';

    let mailer: any = null;
    let emailFrom = process.env.SMTP_FROM || 'thuvien@daihoc.edu.vn';

    if (this.settingsService) {
      try {
        const settings = await this.settingsService.getSettings();
        if (settings.smtpHost && settings.smtpUser && settings.smtpPassword) {
          mailer = createTransport({
            host: settings.smtpHost,
            port: settings.smtpPort || 587,
            secure: Boolean(settings.smtpSecure),
            auth: { user: settings.smtpUser, pass: settings.smtpPassword },
          });
          emailFrom = settings.smtpFrom || settings.smtpUser;
        }
      } catch (err) {
        // Fallback
      }
    }

    if (!mailer && process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASSWORD) {
      mailer = createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT || 587),
        secure: process.env.SMTP_SECURE === 'true',
        auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD },
      });
      emailFrom = process.env.SMTP_FROM || process.env.SMTP_USER;
    }

    if (!mailer) {
      if (notif) {
        notif.emailStatus = EmailDeliveryStatus.NOT_CONFIGURED;
        notif.emailError = 'Máy chủ SMTP chưa được cấu hình';
        await notifRepo.save(notif);
      }
      return { success: false, message: 'Chưa cấu hình máy chủ SMTP gửi thư' };
    }

    try {
      await mailer.sendMail({
        from: emailFrom,
        to: user.email,
        subject: `[THƯ VIỆN] Sách đặt trước "${reservation.book.title}" đã sẵn sàng trên kệ (Thời hạn: 24 giờ)`,
        html: `
          <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:24px;border:1px solid #e2e8f0;border-radius:12px;background:#ffffff;">
            <div style="text-align:center;padding-bottom:16px;border-bottom:2px solid #0f766e;">
              <h2 style="color:#0f766e;margin:0;">📚 HỆ THỐNG THƯ VIỆN SỐ</h2>
              <p style="color:#64748b;margin:4px 0 0 0;font-size:13px;">Thông báo tự động về sách đặt trước đã có sẵn trên kệ</p>
            </div>
            <div style="padding:20px 0;">
              <p>Kính gửi bạn đọc <strong>${user.fullName || user.username}</strong>,</p>
              <p>Đầu sách bạn đăng ký đặt giữ trong hàng đợi FIFO hiện đã có bản sao sẵn sàng trên kệ giữ chỗ tại quầy thư viện:</p>
              <div style="background:#f0fdf4;border-left:4px solid #10b981;padding:14px;border-radius:6px;margin:16px 0;">
                <h3 style="margin:0 0 8px 0;color:#065f46;">📖 ${reservation.book.title}</h3>
                ${reservation.copy?.barcode ? `<div style="font-size:13px;color:#334155;margin-bottom:4px;">Mã vạch (Barcode): <code>${reservation.copy.barcode}</code></div>` : ''}
                <div style="font-size:13px;color:#334155;margin-bottom:4px;">Vị trí kệ nhận sách: <strong>${shelfLocation}</strong></div>
                <div style="font-size:15px;color:#b91c1c;font-weight:700;margin-top:10px;">
                  ⏰ Thời hạn hết hiệu lực giữ chỗ: ${formattedExpiry} (Sau 24 giờ)
                </div>
              </div>
              <div style="background:#fffbeb;border:1px solid #fef3c7;padding:12px;border-radius:6px;font-size:13px;color:#92400e;line-height:1.5;">
                ⚠️ <strong>Lưu ý quan trọng:</strong> Thời hạn giữ sách tối đa là <strong>24 giờ</strong> kể từ thời điểm gửi thông báo. Sau 24 giờ, nếu bạn không đến nhận tại quầy, yêu cầu giữ chỗ sẽ <strong>tự động hết hiệu lực</strong> và sách sẽ được chuyển quyền mượn cho bạn đọc tiếp theo trong danh sách chờ FIFO.
              </div>
            </div>
            <div style="border-top:1px solid #e2e8f0;padding-top:16px;font-size:12px;color:#94a3b8;text-align:center;">
              Đây là thư thông báo tự động từ Hệ thống Quản lý Thư viện. Vui lòng không trả lời thư này.
            </div>
          </div>
        `,
      });

      if (notif) {
        notif.emailStatus = EmailDeliveryStatus.SENT;
        notif.emailError = null;
        await notifRepo.save(notif);
      }
      return { success: true, message: `Đã gửi thành công email thông báo giữ chỗ 24h tới "${user.email}"` };
    } catch (err: any) {
      if (notif) {
        notif.emailStatus = EmailDeliveryStatus.FAILED;
        notif.emailError = err.message;
        await notifRepo.save(notif);
      }
      return { success: false, message: `Lỗi gửi email: ${err.message}` };
    }
  }

  private async createReadyNotification(manager: EntityManager, reservation: Reservation, book: Book) {
    const formattedExpiry = reservation.expiresAt
      ? new Intl.DateTimeFormat('vi-VN', {
          dateStyle: 'medium',
          timeStyle: 'short',
          timeZone: 'Asia/Ho_Chi_Minh',
        }).format(reservation.expiresAt)
      : 'sau 24 giờ';
    const shelfInfo = reservation.copy?.shelf ? ` (Vị trí: Kệ ${reservation.copy.shelf})` : '';

    await manager.save(
      Notification,
      manager.create(Notification, {
        user: reservation.user,
        borrowRecord: null,
        reservation,
        type: NotificationType.RESERVATION_READY,
        title: `[THƯ VIỆN] Sách đặt trước "${book.title}" đã sẵn sàng trên kệ`,
        message: `Sách "${book.title}"${shelfInfo} đã có bản sao sẵn sàng trên kệ tại quầy thư viện. Thời hạn giữ chỗ: 24 giờ (đến hết ${formattedExpiry}). Vui lòng nhận sách trước thời hạn trên; sau 24 giờ yêu cầu giữ chỗ sẽ tự động bị hủy.`,
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
