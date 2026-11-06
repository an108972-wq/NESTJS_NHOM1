import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { BookCopy, BookCopyStatus } from '../books/entities/book-copy.entity';
import { Book } from '../books/entities/book.entity';
import { BorrowRecord } from '../borrow-records/entities/borrow-record.entity';
import { User } from '../users/entities/user.entity';
import { Reservation, ReservationStatus } from './entities/reservation.entity';
import { ReservationsService } from './reservations.service';
import { vi } from 'vitest';
import { Notification } from '../notifications/entities/notification.entity';
import { SettingsService } from '../settings/settings.service';
import { FineViolation } from '../borrow-records/entities/fine-violation.entity';

describe('ReservationsService', () => {
  let service: ReservationsService;
  let dataSource: any;
  const settingsService = {
    getSettings: vi.fn().mockResolvedValue({
      borrowDays: 14,
      maxActiveLoans: 5,
      renewalDays: 14,
      dailyFineRate: 5000,
    }),
  };

  function reservationQueryBuilder(result: Reservation | null) {
    const builder: any = {};
    for (const method of [
      'innerJoin',
      'leftJoinAndSelect',
      'where',
      'andWhere',
      'orderBy',
      'addOrderBy',
      'setLock',
    ]) {
      builder[method] = vi.fn(() => builder);
    }
    builder.getOne = vi.fn().mockResolvedValue(result);
    return builder;
  }

  beforeEach(async () => {
    settingsService.getSettings.mockClear();
    settingsService.getSettings.mockResolvedValue({
      borrowDays: 14,
      maxActiveLoans: 5,
      renewalDays: 14,
      dailyFineRate: 5000,
    });
    dataSource = {};
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReservationsService,
        { provide: getRepositoryToken(Reservation), useValue: {} },
        { provide: getRepositoryToken(User), useValue: {} },
        { provide: getRepositoryToken(BorrowRecord), useValue: {} },
        { provide: getRepositoryToken(FineViolation), useValue: { findOne: vi.fn().mockResolvedValue(null) } },
        { provide: DataSource, useValue: dataSource },
        { provide: SettingsService, useValue: settingsService },
      ],
    }).compile();

    service = module.get<ReservationsService>(ReservationsService);
  });

  it('assigns a returned copy to the first waiting reservation with a 24-hour hold', async () => {
    const copy = { id: 8, status: BookCopyStatus.AVAILABLE } as BookCopy;
    const book = { id: 3 } as Book;
    const next = {
      id: 15,
      status: ReservationStatus.WAITING,
      createdAt: new Date('2026-01-01T10:00:00Z'),
      user: { id: 21, username: 'reader' },
    } as Reservation;
    const queryBuilder = reservationQueryBuilder(next);
    const manager = {
      createQueryBuilder: vi.fn().mockReturnValue(queryBuilder),
      save: vi.fn(async (entity) => entity),
      create: vi.fn((entity, values) => values),
    };

    await expect(service.assignNextWaitingReservation(manager as never, book, copy)).resolves.toBe(
      true,
    );

    expect(next.status).toBe(ReservationStatus.READY);
    expect(next.copy).toBe(copy);
    expect(next.expiresAt?.getTime()).toBeGreaterThan(Date.now() + 23 * 60 * 60 * 1000);
    expect(copy.status).toBe(BookCopyStatus.RESERVED);
    expect(manager.save).toHaveBeenCalledWith(
      Notification,
      expect.objectContaining({ reservation: next, user: next.user }),
    );
    expect(queryBuilder.andWhere).toHaveBeenCalledWith(
      expect.stringContaining('libraryCardExpiresAt'),
      expect.objectContaining({ today: expect.any(String) }),
    );
  });

  it('leaves the copy available when the wait queue is empty', async () => {
    const copy = { id: 8, status: BookCopyStatus.AVAILABLE } as BookCopy;
    const queryBuilder = reservationQueryBuilder(null);
    const manager = {
      createQueryBuilder: vi.fn().mockReturnValue(queryBuilder),
      save: vi.fn(),
    };

    await expect(
      service.assignNextWaitingReservation(manager as never, { id: 3 } as Book, copy),
    ).resolves.toBe(false);
    expect(copy.status).toBe(BookCopyStatus.AVAILABLE);
    expect(manager.save).not.toHaveBeenCalled();
  });

  it('marks a book ready for the first waiting reader, locks a copy, and notifies them', async () => {
    const user = { id: 21, username: 'reader', role: 'READER', isActive: true };
    const book = { id: 3, title: 'Book', availableCopies: 1 } as Book;
    const copy = { id: 8, barcode: 'BC-8', status: BookCopyStatus.AVAILABLE } as BookCopy;
    const reservation = {
      id: 15,
      status: ReservationStatus.WAITING,
      user,
      book,
      copy: null,
    } as Reservation;
    const manager = {
      findOne: vi.fn().mockImplementation((entity) => {
        if (entity === Reservation) return Promise.resolve(reservation);
        if (entity === Book) return Promise.resolve(book);
        if (entity === BookCopy) return Promise.resolve(copy);
        return Promise.resolve(null);
      }),
      save: vi.fn(async (...args) => args[1] ?? args[0]),
      create: vi.fn((_entity, values) => values),
    };
    dataSource.transaction = vi.fn((callback) => callback(manager));

    const ready = await service.markReady(reservation.id);

    expect(ready.status).toBe(ReservationStatus.READY);
    expect(ready.copy).toBe(copy);
    expect(ready.expiresAt.getTime()).toBeGreaterThan(Date.now() + 23 * 60 * 60 * 1000);
    expect(copy.status).toBe(BookCopyStatus.RESERVED);
    expect(book.availableCopies).toBe(0);
    expect(manager.save).toHaveBeenCalledWith(
      Notification,
      expect.objectContaining({ reservation, user }),
    );
  });

  it('does not allow staff to skip an earlier waiting reservation', async () => {
    const book = { id: 3, availableCopies: 1 } as Book;
    const selected = {
      id: 15,
      status: ReservationStatus.WAITING,
      user: { id: 21, role: 'READER', isActive: true },
      book,
    } as Reservation;
    const firstWaiting = { ...selected, id: 14 } as Reservation;
    const manager = {
      findOne: vi.fn()
        .mockResolvedValueOnce(selected)
        .mockResolvedValueOnce(firstWaiting),
    };
    dataSource.transaction = vi.fn((callback) => callback(manager));

    await expect(service.markReady(selected.id)).rejects.toThrow(
      'đứng đầu hàng chờ',
    );
    expect(manager.findOne).toHaveBeenCalledTimes(2);
  });

  it('creates an approved 14-day loan when staff hands over a ready reservation', async () => {
    const reservation = {
      id: 15,
      status: ReservationStatus.READY,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      user: {
        id: 21,
        username: 'reader',
        role: 'READER',
        isActive: true,
        maxActiveLoans: 5,
      },
      book: { id: 3 } as Book,
      copy: { id: 8, status: BookCopyStatus.RESERVED } as BookCopy,
    } as Reservation;
    const manager = {
      findOne: vi.fn().mockImplementation((entity) =>
        Promise.resolve(entity === Reservation ? reservation : null),
      ),
      count: vi.fn().mockResolvedValue(0),
      save: vi.fn(async (entity) => entity),
      create: vi.fn((_entity, values) => values),
    };
    dataSource.transaction = vi.fn((callback) => callback(manager));

    const loan = await service.claim(reservation.id, 0, true);

    expect(loan.status).toBe('BORROWED');
    expect(loan.approvedAt).toBeInstanceOf(Date);
    const expectedDueDate = new Date(loan.approvedAt);
    expectedDueDate.setDate(expectedDueDate.getDate() + 14);
    expect(loan.dueDate).toEqual(expectedDueDate);
    expect(reservation.status).toBe(ReservationStatus.FULFILLED);
    expect(reservation.copy.status).toBe(BookCopyStatus.BORROWED);
  });
});
