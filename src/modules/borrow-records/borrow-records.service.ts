import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  DataSource,
  FindOptionsWhere,
  In,
  LessThan,
  MoreThan,
  Repository,
} from 'typeorm';
import { randomUUID } from 'crypto';
import { BookCopy, BookCopyStatus } from '../books/entities/book-copy.entity';
import { Book } from '../books/entities/book.entity';
import { User } from '../users/entities/user.entity';
import { ReservationsService } from '../reservations/reservations.service';
import {
  BorrowRecord,
  BorrowStatus,
  ReturnCondition,
} from './entities/borrow-record.entity';
import { FinePayment, PaymentMethod, PaymentStatus } from '../payments/entities/payment.entity';
import { SettingsService } from '../settings/settings.service';
import { UserRole } from '../../common/constants/user-role';
import { isLibraryCardExpired } from '../users/library-card';
import { FineViolation, FineViolationType } from './entities/fine-violation.entity';
import { FineAdjustment } from './entities/fine-adjustment.entity';
import { CreateManualFineDto } from './dto/create-manual-fine.dto';

@Injectable()
export class BorrowRecordsService {
  private readonly maxExtensions = 1;

  constructor(
    @InjectRepository(BorrowRecord)
    private readonly borrowRepo: Repository<BorrowRecord>,
    @InjectRepository(Book)
    private readonly bookRepo: Repository<Book>,
    @InjectRepository(BookCopy)
    private readonly copyRepo: Repository<BookCopy>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(FinePayment)
    private readonly finePaymentRepo: Repository<FinePayment>,
    @InjectRepository(FineViolation)
    private readonly fineViolationRepo: Repository<FineViolation>,
    @InjectRepository(FineAdjustment)
    private readonly fineAdjustmentRepo: Repository<FineAdjustment>,
    private readonly dataSource: DataSource,
    private readonly reservationsService: ReservationsService,
    private readonly settingsService: SettingsService,
  ) {}

  async findAll() {
    const records = await this.borrowRepo.find({
      relations: { user: true, book: true, copy: true },
      order: { id: 'DESC' },
    });
    return records.map((record) => this.publicRecord(record));
  }

  async findFines() {
    const now = new Date();
    const settings = await this.settingsService.getSettings();
    const records = await this.borrowRepo.find({
      where: [
        { fineAmount: MoreThan(0) },
        { fineStatus: 'WAIVED' },
        { status: BorrowStatus.BORROWED, dueDate: LessThan(now) },
        { returnCondition: In([ReturnCondition.DAMAGED, ReturnCondition.LOST]) },
      ],
      relations: { user: true, book: true, copy: true },
      order: { borrowedAt: 'DESC' },
    });
    const violations = await this.fineViolationRepo.find({
      relations: { user: true, copy: { book: true } },
      order: { createdAt: 'DESC' },
    });
    const recordIds = records.map((record) => record.id);
    const violationIds = violations.map((violation) => violation.id);
    const paymentFilters = [
      ...(recordIds.length ? [{ borrowRecord: { id: In(recordIds) } }] : []),
      ...(violationIds.length ? [{ violation: { id: In(violationIds) } }] : []),
    ];
    const [payments, adjustments] = await Promise.all([
      paymentFilters.length
        ? this.finePaymentRepo.find({
            where: paymentFilters,
            relations: {
              borrowRecord: { user: true, book: true, copy: true },
              violation: { user: true, copy: { book: true } },
            },
            order: { createdAt: 'DESC' },
          })
        : Promise.resolve([]),
      recordIds.length || violationIds.length
        ? this.fineAdjustmentRepo.find({
            where: [
              ...(recordIds.length ? [{ borrowRecord: { id: In(recordIds) } }] : []),
              ...(violationIds.length ? [{ violation: { id: In(violationIds) } }] : []),
            ],
            order: { createdAt: 'DESC' },
          })
        : Promise.resolve([]),
    ]);
    const inventoryIssues = await this.copyRepo.find({
      where: {
        status: In([
          BookCopyStatus.MAINTENANCE,
          BookCopyStatus.DAMAGED,
          BookCopyStatus.LOST,
        ]),
      },
      relations: { book: true },
      order: { id: 'DESC' },
    });
    return {
      records: records.map((record) => ({
        ...this.publicRecord(record),
        sourceType: 'BORROW',
        estimatedFineAmount:
          record.status === BorrowStatus.BORROWED && record.dueDate && record.dueDate < now
            ? Math.ceil((now.getTime() - record.dueDate.getTime()) / 86_400_000) *
              settings.dailyFineRate
            : 0,
      })),
      manualViolations: violations.map((violation) => ({
        id: violation.id,
        sourceType: 'MANUAL',
        type: violation.type,
        description: violation.description,
        status: 'RETURNED',
        fineAmount: Number(violation.fineAmount),
        fineStatus: violation.fineStatus,
        createdAt: violation.createdAt,
        user: violation.user
          ? {
              id: violation.user.id,
              username: violation.user.username,
              fullName: violation.user.fullName,
              phone: violation.user.phone,
            }
          : null,
        book: violation.copy?.book
          ? { id: violation.copy.book.id, title: violation.copy.book.title }
          : null,
        copy: violation.copy ? { id: violation.copy.id, barcode: violation.copy.barcode } : null,
      })),
      inventoryIssues: inventoryIssues.map((copy) => ({
        id: copy.id,
        barcode: copy.barcode,
        status: copy.status,
        shelf: copy.shelf,
        floor: copy.floor,
        aisle: copy.aisle,
        book: copy.book ? { id: copy.book.id, title: copy.book.title } : null,
      })),
      payments: payments.map((payment) => ({
        id: payment.id,
        txnRef: payment.txnRef,
        borrowRecordId: payment.borrowRecord?.id,
        violationId: payment.violation?.id,
        readerName:
          payment.borrowRecord?.user?.fullName ||
          payment.borrowRecord?.user?.username ||
          payment.violation?.user?.fullName ||
          payment.violation?.user?.username,
        bookTitle: payment.borrowRecord?.book?.title || payment.violation?.copy?.book?.title,
        barcode: payment.borrowRecord?.copy?.barcode || payment.violation?.copy?.barcode,
        amount: Number(payment.amount),
        status: payment.status,
        paymentMethod: payment.paymentMethod,
        createdAt: payment.createdAt,
        paidAt: payment.paidAt,
      })),
      adjustments: adjustments.map((adjustment) => ({
        id: adjustment.id,
        borrowRecordId: adjustment.borrowRecord?.id,
        violationId: adjustment.violation?.id,
        amount: Number(adjustment.amount),
        reason: adjustment.reason,
        createdById: adjustment.createdById,
        createdAt: adjustment.createdAt,
      })),
      vietQr: this.getVietQrConfiguration(),
    };
  }

  async createManualFine(dto: CreateManualFineDto, createdById: number) {
    return this.dataSource.transaction(async (manager) => {
      const user = await manager.findOne(User, {
        where: { id: dto.userId, isActive: true },
        lock: { mode: 'pessimistic_write' },
      });
      if (!user || user.role !== UserRole.READER) {
        throw new NotFoundException('Không tìm thấy độc giả đang hoạt động');
      }

      let copy: BookCopy | null = null;
      if (dto.barcode) {
        copy = await manager.findOne(BookCopy, {
          where: { barcode: dto.barcode },
          relations: { book: true },
          lock: { mode: 'pessimistic_write' },
        });
        if (!copy) throw new NotFoundException('Không tìm thấy bản sao theo barcode');
        if ([BookCopyStatus.BORROWED, BookCopyStatus.RESERVED].includes(copy.status)) {
          throw new BadRequestException('Bản sao đang được quản lý bởi phiếu mượn hoặc đặt giữ');
        }
      }
      if (
        dto.type !== FineViolationType.OTHER &&
        !copy
      ) {
        throw new BadRequestException('Vi phạm hỏng/mất sách cần có barcode bản sao');
      }

      if (copy && dto.type !== FineViolationType.OTHER) {
        if (copy.status === BookCopyStatus.AVAILABLE) {
          copy.book.availableCopies = Math.max(0, copy.book.availableCopies - 1);
          await manager.save(copy.book);
        }
        copy.status =
          dto.type === FineViolationType.LOST ? BookCopyStatus.LOST : BookCopyStatus.DAMAGED;
        await manager.save(copy);
      }

      return manager.save(
        manager.create(FineViolation, {
          user,
          copy,
          type: dto.type,
          description: dto.description.trim(),
          fineAmount: dto.fineAmount,
          fineStatus: 'UNPAID',
          createdById,
        }),
      );
    });
  }

  async collectManualFine(
    fineId: number,
    paymentMethod: PaymentMethod.CASH | PaymentMethod.VIETQR,
    txnRef: string | undefined,
  ) {
    return this.dataSource.transaction(async (manager) => {
      const violation = await manager.findOne(FineViolation, {
        where: { id: fineId },
        relations: { user: true },
        lock: { mode: 'pessimistic_write' },
      });
      if (!violation) throw new NotFoundException('Không tìm thấy phiếu vi phạm');
      if (violation.fineStatus !== 'UNPAID' || Number(violation.fineAmount) <= 0) {
        throw new BadRequestException('Phiếu vi phạm không có khoản phạt cần thu');
      }
      await this.failPendingPayments(manager, { violation: { id: fineId } });
      const payment = await manager.save(
        manager.create(FinePayment, {
          txnRef: txnRef || `MANUAL-${randomUUID().replace(/-/g, '')}`,
          borrowRecord: null,
          violation,
          amount: violation.fineAmount,
          status: PaymentStatus.PAID,
          paymentMethod,
          vnpayTransactionNo: null,
          responseCode: null,
          paidAt: new Date(),
        }),
      );
      violation.fineStatus = 'PAID';
      await manager.save(violation);
      return payment;
    });
  }

  async waiveFine(
    type: 'BORROW' | 'MANUAL',
    id: number,
    amount: number,
    reason: string,
    createdById: number,
  ) {
    return this.dataSource.transaction(async (manager) => {
      const target = type === 'BORROW'
        ? await manager.findOne(BorrowRecord, {
            where: { id },
            lock: { mode: 'pessimistic_write' },
          })
        : await manager.findOne(FineViolation, {
            where: { id },
            lock: { mode: 'pessimistic_write' },
          });
      if (!target) throw new NotFoundException('Không tìm thấy khoản phạt');
      if (target.fineStatus !== 'UNPAID' || amount > Number(target.fineAmount)) {
        throw new BadRequestException('Số tiền miễn giảm vượt khoản phạt chưa thanh toán');
      }

      const relation = type === 'BORROW'
        ? { borrowRecord: target as BorrowRecord }
        : { violation: target as FineViolation };
      await this.failPendingPayments(
        manager,
        type === 'BORROW'
          ? { borrowRecord: { id } }
          : { violation: { id } },
      );
      const adjustment = await manager.save(
        manager.create(FineAdjustment, {
          borrowRecord: type === 'BORROW' ? target as BorrowRecord : null,
          violation: type === 'MANUAL' ? target as FineViolation : null,
          amount,
          reason: reason.trim(),
          createdById,
        }),
      );
      target.fineAmount = Number(target.fineAmount) - amount;
      if (target.fineAmount === 0) target.fineStatus = 'WAIVED';
      await manager.save(target);
      return { ...target, adjustment, ...relation };
    });
  }

  findMine(userId: number) {
    return this.borrowRepo.find({
      where: { user: { id: userId } },
      relations: { book: true, copy: true },
      order: { borrowedAt: 'DESC' },
    });
  }

  async borrowBook(userId: number, bookId: number, barcode?: string) {
    const settings = await this.settingsService.getSettings();
    const unpaidRecord = await this.borrowRepo.findOne({
      where: { user: { id: userId }, fineStatus: 'UNPAID' },
    });
    const unpaidManualFine = await this.fineViolationRepo.findOne({
      where: { user: { id: userId }, fineStatus: 'UNPAID' },
    });
    if (unpaidRecord || unpaidManualFine) {
      throw new BadRequestException('Bạn đang có tiền phạt chưa thanh toán. Vui lòng nộp phạt trước khi mượn sách tiếp!');
    }

    return this.dataSource.transaction(async (manager) => {
      const user = await manager.findOne(User, {
        where: { id: userId, isActive: true },
        lock: { mode: 'pessimistic_write' },
      });
      if (!user) throw new NotFoundException('Không tìm thấy người dùng đang hoạt động');
      if (user.role === UserRole.READER && isLibraryCardExpired(user.libraryCardExpiresAt)) {
        throw new BadRequestException('Thẻ thư viện đã hết hạn; vui lòng gia hạn trước khi mượn sách');
      }
      const activeFine = await manager.findOne(BorrowRecord, {
        where: { user: { id: userId }, fineStatus: 'UNPAID' },
      });
      const activeManualFine = await manager.findOne(FineViolation, {
        where: { user: { id: userId }, fineStatus: 'UNPAID' },
      });
      if (activeFine || activeManualFine) {
        throw new BadRequestException(
          'Bạn đang có tiền phạt chưa thanh toán. Vui lòng nộp phạt trước khi mượn sách tiếp!',
        );
      }

      const activeLoanCount = await manager.count(BorrowRecord, {
        where: {
          user: { id: userId },
          status: In([BorrowStatus.PENDING, BorrowStatus.BORROWED]),
        },
      });
      const activeLoanLimit = Math.min(
        user.maxActiveLoans ?? settings.maxActiveLoans,
        settings.maxActiveLoans,
      );
      if (activeLoanCount >= activeLoanLimit) {
        throw new BadRequestException(
          `Bạn đã đạt giới hạn ${activeLoanLimit} phiếu mượn đang hoạt động`,
        );
      }

      const book = await manager.findOne(Book, {
        where: { id: bookId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!book) throw new NotFoundException('Không tìm thấy sách');
      if (book.availableCopies <= 0) throw new BadRequestException('Sách đã hết lượt mượn');

      const copies = manager.getRepository(BookCopy);
      if (!(await copies.count({ where: { book: { id: bookId } } }))) {
        const availableCopies = Math.min(book.availableCopies, book.totalCopies);
        const legacyCopies = Array.from({ length: book.totalCopies }, (_, index) =>
          copies.create({
            book,
            barcode: `LEGACY-${book.id}-${index + 1}`,
            status: index < availableCopies ? BookCopyStatus.AVAILABLE : BookCopyStatus.BORROWED,
          }),
        );
        await copies.save(legacyCopies);
      }

      const copy = await copies.findOne({
        where: {
          book: { id: bookId },
          status: BookCopyStatus.AVAILABLE,
          ...(barcode ? { barcode } : {}),
        },
        lock: { mode: 'pessimistic_write' },
      });
      if (!copy) throw new BadRequestException('Không tìm thấy bản sao khả dụng');

      copy.status = BookCopyStatus.RESERVED;
      book.availableCopies -= 1;
      await copies.save(copy);
      await manager.save(book);

      const record = await manager.save(
        manager.create(BorrowRecord, {
          user,
          book,
          copy,
          dueDate: null,
          returnedAt: null,
          approvedAt: null,
          status: BorrowStatus.PENDING,
          fineAmount: 0,
          fineStatus: 'NONE',
          extensionCount: 0,
          returnCondition: null,
        }),
      );
      return this.publicRecord(record);
    });
  }

  async borrowByBarcode(userId: number, barcode: string) {
    const copy = await this.copyRepo.findOne({
      where: { barcode },
      relations: { book: true },
    });
    if (!copy || !copy.book) throw new NotFoundException('Không tìm thấy mã bản sao');
    return this.borrowBook(userId, copy.book.id, barcode);
  }

  async borrowManyByBarcodes(userId: number, barcodes: string[]) {
    const normalizedBarcodes = barcodes.map((barcode) => barcode.trim());
    if (
      normalizedBarcodes.some((barcode) => !barcode) ||
      new Set(normalizedBarcodes.map((barcode) => barcode.toLowerCase())).size !==
        normalizedBarcodes.length
    ) {
      throw new BadRequestException('Mã barcode không được để trống hoặc trùng lặp');
    }

    const settings = await this.settingsService.getSettings();
    return this.dataSource.transaction(async (manager) => {
      const user = await manager.findOne(User, {
        where: { id: userId, isActive: true },
        lock: { mode: 'pessimistic_write' },
      });
      if (!user) throw new NotFoundException('Không tìm thấy người dùng đang hoạt động');
      if (user.role === UserRole.READER && isLibraryCardExpired(user.libraryCardExpiresAt)) {
        throw new BadRequestException('Thẻ thư viện đã hết hạn; vui lòng gia hạn trước khi mượn sách');
      }

      const unpaidRecord = await manager.findOne(BorrowRecord, {
        where: { user: { id: userId }, fineStatus: 'UNPAID' },
      });
      const unpaidManualFine = await manager.findOne(FineViolation, {
        where: { user: { id: userId }, fineStatus: 'UNPAID' },
      });
      if (unpaidRecord || unpaidManualFine) {
        throw new BadRequestException(
          'Bạn đang có tiền phạt chưa thanh toán. Vui lòng nộp phạt trước khi mượn sách tiếp!',
        );
      }

      const activeLoanCount = await manager.count(BorrowRecord, {
        where: {
          user: { id: userId },
          status: In([BorrowStatus.PENDING, BorrowStatus.BORROWED]),
        },
      });
      const activeLoanLimit = Math.min(
        user.maxActiveLoans ?? settings.maxActiveLoans,
        settings.maxActiveLoans,
      );
      if (activeLoanCount + normalizedBarcodes.length > activeLoanLimit) {
        throw new BadRequestException(
          `Yêu cầu vượt quá giới hạn ${activeLoanLimit} phiếu mượn đang hoạt động`,
        );
      }

      const copies = manager.getRepository(BookCopy);
      const lockedBooks = new Map<number, Book>();
      const selectedCopies: Array<{ copy: BookCopy; book: Book }> = [];
      for (const barcode of normalizedBarcodes) {
        const copy = await copies.findOne({
          where: { barcode, status: BookCopyStatus.AVAILABLE },
          relations: { book: true },
          lock: { mode: 'pessimistic_write' },
        });
        if (!copy?.book) {
          throw new BadRequestException(`Bản sao ${barcode} không tồn tại hoặc không sẵn sàng`);
        }
        let book = lockedBooks.get(copy.book.id);
        if (!book) {
          book = await manager.findOne(Book, {
            where: { id: copy.book.id },
            lock: { mode: 'pessimistic_write' },
          });
          if (!book) throw new NotFoundException(`Không tìm thấy đầu sách của bản sao ${barcode}`);
          lockedBooks.set(book.id, book);
        }
        if (book.availableCopies <= 0) {
          throw new BadRequestException(`Sách "${book.title}" đã hết lượt mượn`);
        }
        book.availableCopies -= 1;
        selectedCopies.push({ copy, book });
      }

      const records = [];
      for (const { copy, book } of selectedCopies) {
        copy.status = BookCopyStatus.RESERVED;
        await copies.save(copy);
        records.push(
          manager.create(BorrowRecord, {
            user,
            book,
            copy,
            dueDate: null,
            returnedAt: null,
            approvedAt: null,
            status: BorrowStatus.PENDING,
            fineAmount: 0,
            fineStatus: 'NONE',
            extensionCount: 0,
            returnCondition: null,
          }),
        );
      }
      for (const book of lockedBooks.values()) await manager.save(book);
      const savedRecords = await manager.save(records);
      return savedRecords.map((record) => this.publicRecord(record));
    });
  }

  async approve(recordId: number) {
    return this.dataSource.transaction(async (manager) => {
      const record = await this.findRecordForUpdate(recordId, manager);
      if (record.status !== BorrowStatus.PENDING) {
        throw new BadRequestException('Chỉ có thể duyệt yêu cầu đang chờ xử lý');
      }
      if (!record.user.isActive) {
        throw new BadRequestException('Không thể duyệt yêu cầu của tài khoản đã bị khóa');
      }
      if (
        record.user.role === UserRole.READER &&
        isLibraryCardExpired(record.user.libraryCardExpiresAt)
      ) {
        throw new BadRequestException('Thẻ thư viện đã hết hạn; vui lòng gia hạn trước khi duyệt mượn');
      }
      if (!record.copy || record.copy.status !== BookCopyStatus.RESERVED) {
        throw new BadRequestException('Bản sao không còn được giữ cho yêu cầu này');
      }

      const settings = await this.settingsService.getSettings();
      const approvedAt = new Date();
      const dueDate = new Date(approvedAt);
      dueDate.setDate(dueDate.getDate() + settings.borrowDays);
      record.status = BorrowStatus.BORROWED;
      record.approvedAt = approvedAt;
      record.dueDate = dueDate;
      record.copy.status = BookCopyStatus.BORROWED;
      await manager.save(record.copy);
      return this.publicRecord(await manager.save(record));
    });
  }

  async reject(recordId: number) {
    return this.dataSource.transaction(async (manager) => {
      const record = await this.findRecordForUpdate(recordId, manager);
      if (record.status !== BorrowStatus.PENDING) {
        throw new BadRequestException('Chỉ có thể từ chối yêu cầu đang chờ xử lý');
      }
      record.status = BorrowStatus.REJECTED;
      if (record.copy) {
        record.copy.status = BookCopyStatus.AVAILABLE;
        await manager.save(record.copy);
        const assigned = await this.reservationsService.assignNextWaitingReservation(
          manager,
          record.book,
          record.copy,
        );
        if (!assigned) {
          record.book.availableCopies += 1;
          await manager.save(record.book);
        }
      }
      return this.publicRecord(await manager.save(record));
    });
  }

  async extend(recordId: number, requesterId: number, isStaff: boolean) {
    const record = await this.borrowRepo.findOne({
      where: { id: recordId },
      relations: { user: true },
    });
    if (!record) throw new NotFoundException('Không tìm thấy bản ghi mượn sách');
    if (!isStaff && record.user.id !== requesterId) {
      throw new ForbiddenException('Bạn chỉ có thể gia hạn phiếu mượn của mình');
    }
    if (record.status !== BorrowStatus.BORROWED || !record.dueDate) {
      throw new BadRequestException('Chỉ có thể gia hạn sách đang được mượn');
    }
    if (record.extensionCount >= this.maxExtensions) {
      throw new BadRequestException('Phiếu mượn đã sử dụng hết số lần gia hạn');
    }
    if (new Date() > record.dueDate) {
      throw new BadRequestException('Không thể gia hạn phiếu mượn đã quá hạn');
    }

    const settings = await this.settingsService.getSettings();
    const newDueDate = new Date(record.dueDate);
    newDueDate.setDate(newDueDate.getDate() + settings.renewalDays);
    record.dueDate = newDueDate;
    record.extensionCount += 1;
    return this.publicRecord(await this.borrowRepo.save(record));
  }

  async returnBook(
    recordId: number,
    condition: ReturnCondition,
    damageFineAmount?: number,
    collectFineAtCounter = false,
  ) {
    return this.dataSource.transaction(async (manager) => {
      const record = await this.findRecordForUpdate(recordId, manager);
      if (record.status !== BorrowStatus.BORROWED) {
        throw new BadRequestException('Chỉ có thể xác nhận trả sách đang được mượn');
      }
      if (
        condition !== ReturnCondition.NORMAL &&
        (damageFineAmount === undefined ||
          damageFineAmount === null ||
          !Number.isInteger(damageFineAmount) ||
          damageFineAmount < 0)
      ) {
        throw new BadRequestException('Vui lòng nhập mức phạt cho sách hỏng hoặc mất');
      }

      const returnDate = new Date();
      const settings = await this.settingsService.getSettings();
      record.status = BorrowStatus.RETURNED;
      record.returnedAt = returnDate;
      record.returnCondition = condition;
      record.fineAmount = 0;
      record.fineStatus = 'NONE';
      if (record.dueDate && returnDate > record.dueDate) {
        const daysLate = Math.ceil((returnDate.getTime() - record.dueDate.getTime()) / 86_400_000);
        record.fineAmount = daysLate * settings.dailyFineRate;
      }
      if (condition !== ReturnCondition.NORMAL) {
        record.fineAmount += damageFineAmount ?? 0;
      }
      if (record.fineAmount > 0) {
        record.fineStatus = collectFineAtCounter ? 'PAID' : 'UNPAID';
        await manager.save(
          manager.create(FinePayment, {
            txnRef: randomUUID().replace(/-/g, ''),
            borrowRecord: record,
            amount: record.fineAmount,
            status: collectFineAtCounter ? PaymentStatus.PAID : PaymentStatus.INITIATED,
            paymentMethod: collectFineAtCounter ? PaymentMethod.MANUAL : PaymentMethod.VNPAY,
            vnpayTransactionNo: null,
            responseCode: null,
            paidAt: collectFineAtCounter ? returnDate : null,
          }),
        );
      }

      let returnedCopy = record.copy;
      if (returnedCopy) {
        returnedCopy.status = this.copyStatusForCondition(condition);
        await manager.save(returnedCopy);
      } else {
        returnedCopy = await manager.findOne(BookCopy, {
          where: { book: { id: record.book.id }, status: BookCopyStatus.BORROWED },
          lock: { mode: 'pessimistic_write' },
        });
        if (returnedCopy) {
          returnedCopy.status = this.copyStatusForCondition(condition);
          await manager.save(returnedCopy);
        }
      }

      if (condition === ReturnCondition.NORMAL && returnedCopy) {
        const assigned = await this.reservationsService.assignNextWaitingReservation(
          manager,
          record.book,
          returnedCopy,
        );
        if (!assigned) {
          record.book.availableCopies += 1;
          await manager.save(record.book);
        }
      } else if (condition === ReturnCondition.NORMAL) {
        record.book.availableCopies += 1;
        await manager.save(record.book);
      }
      return this.publicRecord(await manager.save(record));
    });
  }

  async returnByBarcode(
    barcode: string,
    condition: ReturnCondition,
    damageFineAmount?: number,
    collectFineAtCounter = false,
  ) {
    const record = await this.borrowRepo.findOne({
      where: {
        copy: { barcode },
        status: BorrowStatus.BORROWED,
      },
    });
    if (!record) throw new NotFoundException('Không tìm thấy phiếu mượn đang hoạt động cho mã bản sao');
    return this.returnBook(record.id, condition, damageFineAmount, collectFineAtCounter);
  }

  async payFine(
    recordId: number,
    requesterId: number,
    isStaff: boolean,
    paymentMethod: PaymentMethod.CASH | PaymentMethod.VIETQR | PaymentMethod.MANUAL =
      PaymentMethod.MANUAL,
    txnRef?: string,
  ) {
    return this.dataSource.transaction(async (manager) => {
      const record = await this.findRecordForUpdate(recordId, manager);
      if (!isStaff && record.user.id !== requesterId) {
        throw new ForbiddenException('Bạn chỉ có thể thanh toán tiền phạt của mình');
      }
      if (record.status !== BorrowStatus.RETURNED || record.fineStatus !== 'UNPAID') {
        throw new BadRequestException('Bản ghi này không có tiền phạt cần xác nhận');
      }

      if (Number(record.fineAmount) <= 0) {
        throw new BadRequestException('Số tiền phạt cần thu không hợp lệ');
      }
      await this.failPendingPayments(manager, { borrowRecord: { id: recordId } });
      await manager.save(
        manager.create(FinePayment, {
          txnRef: txnRef || `MANUAL-${randomUUID().replace(/-/g, '')}`,
          borrowRecord: record,
          violation: null,
          amount: record.fineAmount,
          status: PaymentStatus.PAID,
          paymentMethod,
          vnpayTransactionNo: null,
          responseCode: null,
          paidAt: new Date(),
        }),
      );
      record.fineStatus = 'PAID';
      return this.publicRecord(await manager.save(record));
    });
  }

  private async failPendingPayments(
    manager: DataSource['manager'],
    where: FindOptionsWhere<FinePayment>,
  ) {
    const pending = await manager.find(FinePayment, {
      where: { ...where, status: PaymentStatus.INITIATED },
      lock: { mode: 'pessimistic_write' },
    });
    for (const payment of pending) {
      payment.status = PaymentStatus.FAILED;
      await manager.save(payment);
    }
  }

  private getVietQrConfiguration() {
    const bankId = process.env.VIETQR_BANK_ID?.trim();
    const accountNo = process.env.VIETQR_ACCOUNT_NO?.trim();
    const accountName = process.env.VIETQR_ACCOUNT_NAME?.trim();
    return bankId && accountNo && accountName
      ? { bankId, accountNo, accountName }
      : null;
  }

  private async findRecordForUpdate(recordId: number, manager: DataSource['manager']) {
    const record = await manager.findOne(BorrowRecord, {
      where: { id: recordId },
      relations: { book: true, copy: true, user: true },
      lock: { mode: 'pessimistic_write' },
    });
    if (!record) throw new NotFoundException('Không tìm thấy bản ghi mượn sách');
    return record;
  }

  private copyStatusForCondition(condition: ReturnCondition) {
    if (condition === ReturnCondition.LIGHT_DAMAGE) return BookCopyStatus.MAINTENANCE;
    if (condition === ReturnCondition.DAMAGED || condition === ReturnCondition.SEVERE_DAMAGE) {
      return BookCopyStatus.DAMAGED;
    }
    if (condition === ReturnCondition.LOST) return BookCopyStatus.LOST;
    return BookCopyStatus.AVAILABLE;
  }

  private publicRecord(record: BorrowRecord) {
    if (!record.user) return record;
    return {
      ...record,
      user: {
        id: record.user.id,
        username: record.user.username,
        fullName: record.user.fullName,
        phone: record.user.phone,
        email: record.user.email,
        role: record.user.role,
      },
    };
  }
}
