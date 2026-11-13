import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { AcademicExchangeService } from './academic-exchange.service';
import {
  ExchangeGrant,
  ExchangeGrantType,
  Seminar,
  SeminarStatus,
} from './entities/academic-exchange.entity';
import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('AcademicExchangeService', () => {
  let service: AcademicExchangeService;

  const mockSeminar = {
    id: 1,
    title: 'Hội thảo AI',
    speakerNames: 'GS. Ngô Bảo Châu',
    status: SeminarStatus.UPCOMING,
    maxSeats: 100,
    registeredSeats: 50,
    attendanceListJson: '[]',
  };

  const mockGrant = {
    id: 1,
    title: 'Trao đổi sách NUS',
    programType: ExchangeGrantType.BOOK_EXCHANGE,
    bookQuantity: 200,
    grantAmount: 50000000,
    beneficiariesCount: 150,
    status: 'ACTIVE',
  };

  const mockSeminarRepo = {
    count: vi.fn().mockResolvedValue(1),
    find: vi.fn().mockResolvedValue([mockSeminar]),
    findOne: vi.fn().mockResolvedValue(mockSeminar),
    create: vi.fn().mockImplementation((dto) => dto),
    save: vi.fn().mockImplementation((s) => Promise.resolve({ id: 1, ...s })),
    remove: vi.fn().mockResolvedValue(mockSeminar),
    createQueryBuilder: vi.fn(() => ({
      andWhere: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      getMany: vi.fn().mockResolvedValue([mockSeminar]),
    })),
  };

  const mockGrantRepo = {
    count: vi.fn().mockResolvedValue(1),
    find: vi.fn().mockResolvedValue([mockGrant]),
    findOne: vi.fn().mockResolvedValue(mockGrant),
    create: vi.fn().mockImplementation((dto) => dto),
    save: vi.fn().mockImplementation((g) => Promise.resolve({ id: 1, ...g })),
    remove: vi.fn().mockResolvedValue(mockGrant),
    createQueryBuilder: vi.fn(() => ({
      andWhere: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      getMany: vi.fn().mockResolvedValue([mockGrant]),
    })),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AcademicExchangeService,
        {
          provide: getRepositoryToken(Seminar),
          useValue: mockSeminarRepo,
        },
        {
          provide: getRepositoryToken(ExchangeGrant),
          useValue: mockGrantRepo,
        },
      ],
    }).compile();

    service = module.get<AcademicExchangeService>(AcademicExchangeService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('gets seminars stats accurately', async () => {
    const stats = await service.getSeminarsStats();
    expect(stats.total).toBe(1);
    expect(stats.upcoming).toBe(1);
    expect(stats.totalRegistered).toBe(50);
  });

  it('registers attendee to seminar', async () => {
    const sem = await service.registerSeminar(1, {
      fullName: 'Trần Văn Nam',
      email: 'nam.tv@bk.edu.vn',
      cardNumber: 'SV2025-001',
    });
    expect(sem.registeredSeats).toBe(51);
  });
});

