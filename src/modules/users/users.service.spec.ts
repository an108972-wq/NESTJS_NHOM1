import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { BorrowRecord, BorrowStatus } from '../borrow-records/entities/borrow-record.entity';
import { User } from './entities/user.entity';
import { UsersService } from './users.service.js';
import { UserRole } from '../../common/constants/user-role';
import { vi } from 'vitest';
import { Reservation } from '../reservations/entities/reservation.entity';
import { SettingsService } from '../settings/settings.service';
import { FineViolation } from '../borrow-records/entities/fine-violation.entity';

describe('UsersService', () => {
  let service: UsersService;
  let usersRepository: any;
  let borrowRepository: any;
  let reservationsRepository: any;
  let fineViolationRepository: any;
  let user: User;
  let manager: any;

  beforeEach(async () => {
    user = {
      id: 8,
      username: 'reader',
      email: 'reader@example.test',
      role: UserRole.READER,
      isActive: true,
      maxActiveLoans: 5,
    } as User;
    usersRepository = {
      findOneBy: vi.fn().mockResolvedValue(user),
      save: vi.fn(async (value) => value),
    };
    borrowRepository = { count: vi.fn().mockResolvedValue(2) };
    reservationsRepository = { find: vi.fn().mockResolvedValue([]) };
    fineViolationRepository = { find: vi.fn().mockResolvedValue([]) };
    manager = {
      findOne: vi.fn().mockResolvedValue(user),
      findOneBy: vi.fn().mockResolvedValue(null),
      count: vi.fn().mockResolvedValue(2),
      save: vi.fn(async (value) => value),
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: getRepositoryToken(User), useValue: usersRepository },
        { provide: getRepositoryToken(BorrowRecord), useValue: borrowRepository },
        { provide: getRepositoryToken(Reservation), useValue: reservationsRepository },
        { provide: getRepositoryToken(FineViolation), useValue: fineViolationRepository },
        { provide: DataSource, useValue: { transaction: (callback) => callback(manager) } },
        {
          provide: SettingsService,
          useValue: { getSettings: vi.fn().mockResolvedValue({ maxActiveLoans: 5, borrowDays: 14, renewalDays: 14, dailyFineRate: 5000 }) },
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('does not lower a reader loan limit below their active loans', async () => {
    manager.count.mockResolvedValue(4);

    await expect(service.update(8, { maxActiveLoans: 3 })).rejects.toThrow(
      'không thể thấp hơn 4 phiếu mượn đang hoạt động',
    );
    expect(manager.save).not.toHaveBeenCalled();
  });

  it('updates a reader loan limit when it remains above active loans', async () => {
    manager.count.mockResolvedValue(3);

    const updated = await service.update(8, { maxActiveLoans: 4 });

    expect(updated.maxActiveLoans).toBe(4);
    expect(manager.save).toHaveBeenCalledWith(
      expect.objectContaining({ maxActiveLoans: 4 }),
    );
  });

  it('updates library card validity dates and clears the expiry when requested', async () => {
    const updated = await service.update(8, {
      libraryCardIssuedAt: '2025-01-01',
      libraryCardExpiresAt: '2027-01-01',
    });

    expect(updated.libraryCardIssuedAt).toEqual(new Date('2025-01-01'));
    expect(updated.libraryCardExpiresAt).toEqual(new Date('2027-01-01'));
    expect(manager.save).toHaveBeenCalled();

    const withoutExpiry = await service.update(8, { libraryCardExpiresAt: null });
    expect(withoutExpiry.libraryCardExpiresAt).toBeNull();
  });

  it('rejects card expiry dates before the issue date', async () => {
    user.libraryCardIssuedAt = new Date('2025-06-01');

    await expect(
      service.update(8, { libraryCardExpiresAt: '2025-05-31' }),
    ).rejects.toThrow('Ngày hết hạn thẻ không thể trước ngày cấp');
    expect(manager.save).not.toHaveBeenCalled();
  });

  it('includes fines, current loans, and holds in the reader profile', async () => {
    borrowRepository.find = vi.fn().mockResolvedValue([
      { status: BorrowStatus.BORROWED, fineAmount: 3000, fineStatus: 'UNPAID' },
      { status: BorrowStatus.RETURNED, fineAmount: 2000, fineStatus: 'PAID' },
    ]);
    reservationsRepository.find.mockResolvedValue([{ status: 'READY' }]);
    fineViolationRepository.find.mockResolvedValue([
      { id: 20, fineAmount: 7_500, fineStatus: 'UNPAID' },
    ]);

    const profile = await service.findProfile(8);

    expect(profile.currentLoans).toHaveLength(1);
    expect(profile.reservations).toHaveLength(1);
    expect(profile.totalFineAmount).toBe(12_500);
    expect(profile.unpaidFineAmount).toBe(10_500);
    expect(profile.paidFineAmount).toBe(2000);
    expect(profile.manualViolations).toHaveLength(1);
  });

  it('estimates unpaid late fees for active overdue loans', async () => {
    borrowRepository.find = vi.fn().mockResolvedValue([
      {
        status: BorrowStatus.BORROWED,
        dueDate: new Date(Date.now() - 86_400_000 - 1000),
        fineAmount: 0,
        fineStatus: 'NONE',
      },
    ]);

    const profile = await service.findProfile(8);

    expect(profile.loans[0].estimatedFineAmount).toBe(10_000);
    expect(profile.totalFineAmount).toBe(10_000);
    expect(profile.unpaidFineAmount).toBe(10_000);
    expect(profile.paidFineAmount).toBe(0);
  });

  it('approves a pending reader and issues a library card', async () => {
    user.isActive = false;
    user.approvedAt = null;
    user.libraryCardIssuedAt = null;

    const approved = await service.updateStatus(user.id, true);

    expect(approved.isActive).toBe(true);
    expect(approved.approvedAt).toBeInstanceOf(Date);
    expect(approved.libraryCardIssuedAt).toBeInstanceOf(Date);
    expect(usersRepository.save).toHaveBeenCalledWith(user);
  });
});
