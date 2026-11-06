import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { Book } from '../books/entities/book.entity';
import { BookCopy, BookCopyStatus } from '../books/entities/book-copy.entity';
import { User } from '../users/entities/user.entity';
import { BorrowRecord, BorrowStatus, ReturnCondition } from './entities/borrow-record.entity';
import { BorrowRecordsService } from './borrow-records.service';
import { ReservationsService } from '../reservations/reservations.service';
import { FinePayment, PaymentMethod, PaymentStatus } from '../payments/entities/payment.entity';
import { vi } from 'vitest';
import { SettingsService } from '../settings/settings.service';
import { UserRole } from '../../common/constants/user-role';
import { FineViolation, FineViolationType } from './entities/fine-violation.entity';
import { FineAdjustment } from './entities/fine-adjustment.entity';

describe('BorrowRecordsService', () => {
  let service: BorrowRecordsService;
  let book: Book;
  let copy: BookCopy;
  let manager: any;
  let copies: any;
  let borrowRepository: any;
  let settingsService: any;

  beforeEach(async () => {
    book = { id: 3, availableCopies: 2, totalCopies: 2 } as Book;
    copy = { id: 8, barcode: 'COPY-8', status: BookCopyStatus.AVAILABLE, book } as BookCopy;
    const user = { id: 7, isActive: true, maxActiveLoans: 5 } as User;
    copies = {
      count: vi.fn().mockResolvedValue(2),
      findOne: vi.fn().mockResolvedValue(copy),
      save: vi.fn(async (entity) => entity),
      create: vi.fn((entity) => entity),
    };
    manager = {
      findOne: vi.fn().mockImplementation((entity) =>
        Promise.resolve(
          entity === User
            ? user
            : entity === FineViolation || entity === BorrowRecord
              ? null
              : book,
        ),
      ),
      find: vi.fn().mockResolvedValue([]),
      count: vi.fn().mockResolvedValue(0),
      getRepository: vi.fn().mockReturnValue(copies),
      save: vi.fn(async (entity) => entity),
      create: vi.fn((entity, values) => values),
    };
    const dataSource = {
      transaction: vi.fn((callback) => callback(manager)),
    };
    borrowRepository = { findOne: vi.fn().mockResolvedValue(null), save: vi.fn(async (record) => record) };
    settingsService = {
      getSettings: vi.fn().mockResolvedValue({
        maxActiveLoans: 5,
        borrowDays: 14,
        renewalDays: 14,
        dailyFineRate: 5000,
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BorrowRecordsService,
        { provide: getRepositoryToken(BorrowRecord), useValue: borrowRepository },
        { provide: getRepositoryToken(Book), useValue: {} },
        { provide: getRepositoryToken(BookCopy), useValue: {} },
        { provide: getRepositoryToken(User), useValue: { findOneBy: vi.fn().mockResolvedValue(user) } },
        { provide: getRepositoryToken(FinePayment), useValue: { find: vi.fn().mockResolvedValue([]) } },
        {
          provide: getRepositoryToken(FineViolation),
          useValue: {
            find: vi.fn().mockResolvedValue([]),
            findOne: vi.fn().mockResolvedValue(null),
          },
        },
        { provide: getRepositoryToken(FineAdjustment), useValue: { find: vi.fn().mockResolvedValue([]) } },
        { provide: DataSource, useValue: dataSource },
        {
          provide: ReservationsService,
          useValue: { assignNextWaitingReservation: vi.fn().mockResolvedValue(false) },
        },
        { provide: SettingsService, useValue: settingsService },
      ],
    }).compile();

    service = module.get<BorrowRecordsService>(BorrowRecordsService);
  });

  it('creates a pending request and reserves one available copy', async () => {
    const result = await service.borrowBook(7, 3);

    expect(result.status).toBe(BorrowStatus.PENDING);
    expect(result.dueDate).toBeNull();
    expect(copy.status).toBe(BookCopyStatus.RESERVED);
    expect(book.availableCopies).toBe(1);
  });

  it('creates multiple barcode requests together and reserves each selected copy', async () => {
    const secondCopy = {
      id: 9,
      barcode: 'COPY-9',
      status: BookCopyStatus.AVAILABLE,
      book,
    } as BookCopy;
    copies.findOne.mockImplementation(({ where }) =>
      Promise.resolve(where.barcode === 'COPY-8' ? copy : secondCopy),
    );
    manager.findOne.mockImplementation((entity) => {
      if (entity === User) return Promise.resolve({ id: 7, isActive: true, maxActiveLoans: 5 });
      if (entity === BorrowRecord) return Promise.resolve(null);
      if (entity === FineViolation) return Promise.resolve(null);
      return Promise.resolve(book);
    });

    const records = await service.borrowManyByBarcodes(7, ['COPY-8', 'COPY-9']);

    expect(records).toHaveLength(2);
    expect(records.every((record) => record.status === BorrowStatus.PENDING)).toBe(true);
    expect(copy.status).toBe(BookCopyStatus.RESERVED);
    expect(secondCopy.status).toBe(BookCopyStatus.RESERVED);
    expect(book.availableCopies).toBe(0);
  });

  it('rejects duplicate barcodes before opening a batch transaction', async () => {
    await expect(service.borrowManyByBarcodes(7, ['COPY-8', ' COPY-8 '])).rejects.toThrow(
      'không được để trống hoặc trùng lặp',
    );
  });

  it('rejects a request when the reader has reached their active loan limit', async () => {
    manager.count.mockResolvedValue(5);

    await expect(service.borrowBook(7, 3)).rejects.toThrow('đã đạt giới hạn 5');

    expect(manager.findOne).toHaveBeenCalledWith(
      User,
      expect.objectContaining({ where: { id: 7, isActive: true } }),
    );
    expect(manager.findOne).not.toHaveBeenCalledWith(Book, expect.anything());
  });

  it('blocks new borrowing when the reader card has expired', async () => {
    const expiredReader = {
      id: 7,
      isActive: true,
      role: UserRole.READER,
      libraryCardExpiresAt: '2000-01-01',
    } as User;
    manager.findOne.mockImplementation((entity) =>
      Promise.resolve(entity === User ? expiredReader : book),
    );

    await expect(service.borrowBook(7, 3)).rejects.toThrow('Thẻ thư viện đã hết hạn');

    expect(manager.count).not.toHaveBeenCalled();
    expect(manager.findOne).not.toHaveBeenCalledWith(Book, expect.anything());
  });

  it('does not approve a pending request when the reader card has expired', async () => {
    const record = {
      id: 12,
      status: BorrowStatus.PENDING,
      user: {
        id: 7,
        isActive: true,
        role: UserRole.READER,
        libraryCardExpiresAt: '2000-01-01',
      },
    };
    manager.findOne.mockImplementation((entity) =>
      Promise.resolve(entity === BorrowRecord ? record : book),
    );

    await expect(service.approve(12)).rejects.toThrow('Thẻ thư viện đã hết hạn');

    expect(manager.save).not.toHaveBeenCalled();
  });

  it('approves a pending request and starts the 14-day loan period', async () => {
    const record = {
      id: 12,
      status: BorrowStatus.PENDING,
      user: { id: 7, isActive: true },
      book,
      copy: { ...copy, status: BookCopyStatus.RESERVED },
    };
    manager.findOne.mockImplementation((entity) =>
      Promise.resolve(entity === BorrowRecord ? record : entity === User ? record.user : book),
    );

    const result = await service.approve(12);

    expect(result.status).toBe(BorrowStatus.BORROWED);
    const expectedDueDate = new Date(result.approvedAt);
    expectedDueDate.setDate(expectedDueDate.getDate() + 14);
    expect(result.dueDate).toEqual(expectedDueDate);
    expect(result.copy.status).toBe(BookCopyStatus.BORROWED);
  });

  it('extends the due date by the configured renewal interval', async () => {
    const dueDate = new Date(2026, 10, 10);
    const record = {
      id: 12,
      status: BorrowStatus.BORROWED,
      user: { id: 7 },
      dueDate,
      extensionCount: 0,
    };
    borrowRepository.findOne.mockResolvedValue(record);
    settingsService.getSettings.mockResolvedValue({
      maxActiveLoans: 5,
      borrowDays: 14,
      renewalDays: 7,
      dailyFineRate: 5000,
    });

    const result = await service.extend(12, 7, false);

    const expectedDueDate = new Date(dueDate);
    expectedDueDate.setDate(expectedDueDate.getDate() + 7);
    expect(result.dueDate).toEqual(expectedDueDate);
  });

  it('records an overdue fine payment and marks the copy returned', async () => {
    const record = {
      id: 12,
      status: BorrowStatus.BORROWED,
      dueDate: new Date(Date.now() - 2 * 86_400_000 + 1_000),
      user: { id: 7, username: 'reader', isActive: true },
      book,
      copy: { ...copy, status: BookCopyStatus.BORROWED },
      fineAmount: 0,
      fineStatus: 'NONE',
    };
    manager.findOne.mockImplementation((entity) =>
      Promise.resolve(entity === BorrowRecord ? record : entity === User ? record.user : book),
    );

    const result = await service.returnBook(12, 'NORMAL' as never);

    expect(result.status).toBe(BorrowStatus.RETURNED);
    expect(result.fineAmount).toBe(10_000);
    expect(result.fineStatus).toBe('UNPAID');
    expect(manager.save).toHaveBeenCalledWith(
      expect.objectContaining({
        amount: 10_000,
        status: PaymentStatus.INITIATED,
        borrowRecord: record,
      }),
    );
    expect(record.copy.status).toBe(BookCopyStatus.AVAILABLE);
  });

  it('requires and records a manually assessed fine for damaged or lost copies', async () => {
    const record = {
      id: 12,
      status: BorrowStatus.BORROWED,
      dueDate: new Date(Date.now() + 2 * 86_400_000),
      user: { id: 7, username: 'reader', isActive: true },
      book,
      copy: { ...copy, status: BookCopyStatus.BORROWED },
      fineAmount: 0,
      fineStatus: 'NONE',
    };
    manager.findOne.mockImplementation((entity) =>
      Promise.resolve(entity === BorrowRecord ? record : book),
    );

    await expect(service.returnBook(12, ReturnCondition.DAMAGED)).rejects.toThrow(
      'Vui lòng nhập mức phạt',
    );
    const result = await service.returnBook(12, ReturnCondition.DAMAGED, 25_000);

    expect(result.fineAmount).toBe(25_000);
    expect(result.fineStatus).toBe('UNPAID');
    expect(record.copy.status).toBe(BookCopyStatus.DAMAGED);
  });

  it('collects the overdue fine atomically when the return is confirmed at the counter', async () => {
    const record = {
      id: 12,
      status: BorrowStatus.BORROWED,
      dueDate: new Date(Date.now() - 86_400_000 - 1000),
      user: { id: 7, username: 'reader', isActive: true },
      book,
      copy: { ...copy, status: BookCopyStatus.BORROWED },
      fineAmount: 0,
      fineStatus: 'NONE',
    };
    manager.findOne.mockImplementation((entity) =>
      Promise.resolve(entity === BorrowRecord ? record : book),
    );

    const result = await service.returnBook(12, ReturnCondition.NORMAL, undefined, true);

    expect(result.fineStatus).toBe('PAID');
    expect(manager.save).toHaveBeenCalledWith(
      expect.objectContaining({
        amount: 10_000,
        status: PaymentStatus.PAID,
        paymentMethod: 'MANUAL',
        paidAt: expect.any(Date),
      }),
    );
  });

  it('marks a lightly damaged returned copy for maintenance', async () => {
    const record = {
      id: 12,
      status: BorrowStatus.BORROWED,
      dueDate: new Date(Date.now() + 86_400_000),
      user: { id: 7, username: 'reader', isActive: true },
      book,
      copy: { ...copy, status: BookCopyStatus.BORROWED },
      fineAmount: 0,
      fineStatus: 'NONE',
    };
    manager.findOne.mockImplementation((entity) =>
      Promise.resolve(entity === BorrowRecord ? record : book),
    );

    await service.returnBook(12, ReturnCondition.LIGHT_DAMAGE, 5_000);

    expect(record.copy.status).toBe(BookCopyStatus.MAINTENANCE);
    expect(record.fineAmount).toBe(5_000);
  });

  it('confirms manual fine collection for staff and records it as paid', async () => {
    const record = {
      id: 12,
      status: BorrowStatus.RETURNED,
      user: { id: 7, username: 'reader' },
      book,
      fineAmount: 5_000,
      fineStatus: 'UNPAID',
    };
    const payment = {
      id: 18,
      txnRef: 'existing-reference',
      amount: 5_000,
      status: PaymentStatus.INITIATED,
      paymentMethod: 'VNPAY',
      borrowRecord: record,
    };
    manager.findOne.mockImplementation((entity) =>
      Promise.resolve(
        entity === BorrowRecord ? record : entity === FinePayment ? payment : entity === FineViolation ? null : book,
      ),
    );
    manager.find.mockResolvedValue([payment]);

    const result = await service.payFine(12, 1, true);

    expect(result.fineStatus).toBe('PAID');
    expect(payment.status).toBe(PaymentStatus.FAILED);
    expect(manager.save).toHaveBeenCalledWith(
      expect.objectContaining({
        status: PaymentStatus.PAID,
        paymentMethod: 'MANUAL',
        amount: 5_000,
      }),
    );
    expect(manager.save).toHaveBeenCalledWith(record);
  });

  it('creates a counter damage violation and marks the copy unavailable', async () => {
    const user = { id: 7, role: UserRole.READER, isActive: true } as User;
    manager.findOne.mockImplementation((entity) =>
      Promise.resolve(entity === User ? user : entity === BookCopy ? copy : null),
    );

    const violation = await service.createManualFine({
      userId: 7,
      type: FineViolationType.DAMAGED,
      description: 'Bị rách trang',
      fineAmount: 20_000,
      barcode: copy.barcode,
    }, 1);

    expect(violation.fineStatus).toBe('UNPAID');
    expect(copy.status).toBe(BookCopyStatus.DAMAGED);
    expect(book.availableCopies).toBe(1);
  });

  it('collects a manual violation via VietQR and updates the collection ledger', async () => {
    const violation = {
      id: 20,
      fineAmount: 20_000,
      fineStatus: 'UNPAID',
      user: { id: 7 },
    } as FineViolation;
    manager.findOne.mockImplementation((entity) =>
      Promise.resolve(entity === FineViolation ? violation : null),
    );

    const payment = await service.collectManualFine(
      20,
      PaymentMethod.VIETQR,
      'THU-MANUAL-20-abc',
    );

    expect(violation.fineStatus).toBe('PAID');
    expect(payment).toMatchObject({
      txnRef: 'THU-MANUAL-20-abc',
      amount: 20_000,
      status: PaymentStatus.PAID,
      paymentMethod: PaymentMethod.VIETQR,
      violation,
    });
  });

  it('records a partial waiver and keeps the remaining amount due', async () => {
    const record = {
      id: 12,
      fineAmount: 10_000,
      fineStatus: 'UNPAID',
    } as BorrowRecord;
    manager.findOne.mockImplementation((entity) =>
      Promise.resolve(entity === BorrowRecord ? record : null),
    );

    const result = await service.waiveFine('BORROW', 12, 4_000, 'Trường hợp đặc biệt', 1);

    expect(record.fineAmount).toBe(6_000);
    expect(record.fineStatus).toBe('UNPAID');
    expect(result.adjustment).toMatchObject({
      amount: 4_000,
      reason: 'Trường hợp đặc biệt',
      createdById: 1,
    });
  });

  it('marks a fully waived fine as waived and records the reason', async () => {
    const record = { id: 12, fineAmount: 10_000, fineStatus: 'UNPAID' } as BorrowRecord;
    manager.findOne.mockImplementation((entity) =>
      Promise.resolve(entity === BorrowRecord ? record : null),
    );

    await service.waiveFine('BORROW', 12, 10_000, 'Miễn toàn bộ có phê duyệt', 1);

    expect(record.fineAmount).toBe(0);
    expect(record.fineStatus).toBe('WAIVED');
  });
});
