import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { InternalOperationsService } from './internal-operations.service';
import {
  KpiRank,
  LibraryZone,
  ShiftSchedule,
  ShiftStatus,
  ShiftType,
  StaffKpi,
} from './entities/internal-operation.entity';
import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('InternalOperationsService', () => {
  let service: InternalOperationsService;

  const mockShift = {
    id: 1,
    shiftDate: '2026-11-15',
    shiftType: ShiftType.MORNING,
    zone: LibraryZone.CIRCULATION_DESK,
    staffName: 'Thủ thư Quản',
    status: ShiftStatus.ASSIGNED,
  };

  const mockKpi = {
    id: 1,
    staffName: 'Thủ thư Quản',
    monthYear: '2026-11',
    catalogedBooksCount: 150,
    processedLoansCount: 500,
    inventoryAuditsCount: 10,
    totalKpiPoints: 95,
    kpiRank: KpiRank.EXCELLENT,
  };

  const mockShiftRepo = {
    count: vi.fn().mockResolvedValue(1),
    find: vi.fn().mockResolvedValue([mockShift]),
    findOne: vi.fn().mockResolvedValue(mockShift),
    create: vi.fn().mockImplementation((dto) => dto),
    save: vi.fn().mockImplementation((s) => Promise.resolve({ id: 1, ...s })),
    remove: vi.fn().mockResolvedValue(mockShift),
    createQueryBuilder: vi.fn(() => ({
      andWhere: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      addOrderBy: vi.fn().mockReturnThis(),
      getMany: vi.fn().mockResolvedValue([mockShift]),
    })),
  };

  const mockKpiRepo = {
    count: vi.fn().mockResolvedValue(1),
    find: vi.fn().mockResolvedValue([mockKpi]),
    findOne: vi.fn().mockResolvedValue(mockKpi),
    create: vi.fn().mockImplementation((dto) => dto),
    save: vi.fn().mockImplementation((k) => Promise.resolve({ id: 1, ...k })),
    remove: vi.fn().mockResolvedValue(mockKpi),
    createQueryBuilder: vi.fn(() => ({
      andWhere: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      getMany: vi.fn().mockResolvedValue([mockKpi]),
    })),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InternalOperationsService,
        {
          provide: getRepositoryToken(ShiftSchedule),
          useValue: mockShiftRepo,
        },
        {
          provide: getRepositoryToken(StaffKpi),
          useValue: mockKpiRepo,
        },
      ],
    }).compile();

    service = module.get<InternalOperationsService>(InternalOperationsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('gets shifts stats accurately', async () => {
    const stats = await service.getShiftsStats();
    expect(stats.total).toBe(1);
    expect(stats.assigned).toBe(1);
  });

  it('swaps shift and updates status', async () => {
    const res = await service.swapShift(1, {
      swapWithStaffName: 'Thủ thư Hồng',
      reason: 'Bận việc riêng',
    });
    expect(res.status).toBe(ShiftStatus.SWAPPED);
    expect(res.swapWithStaffName).toBe('Thủ thư Hồng');
  });
});

