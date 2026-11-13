import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { AcademicResourcesService } from './academic-resources.service';
import {
  MultimediaCondition,
  MultimediaItem,
  MultimediaType,
  Thesis,
  ThesisSecurityStatus,
} from './entities/academic-resource.entity';
import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('AcademicResourcesService', () => {
  let service: AcademicResourcesService;

  const mockThesis = {
    id: 1,
    code: 'LV-2025-001',
    title: 'Nghiên cứu AI',
    authorName: 'Đặng Tuấn Anh',
    advisorName: 'PGS. TS. Dũng',
    major: 'CNTT',
    defenseYear: 2025,
    securityStatus: ThesisSecurityStatus.PUBLIC,
    viewCount: 10,
  };

  const mockMultimedia = {
    id: 1,
    code: 'MM-01',
    title: 'Đĩa DVD',
    type: MultimediaType.CD_DVD,
    condition: MultimediaCondition.GOOD,
    onSiteLoanCount: 5,
  };

  const mockThesisRepo = {
    count: vi.fn().mockResolvedValue(1),
    find: vi.fn().mockResolvedValue([mockThesis]),
    findOne: vi.fn().mockResolvedValue(mockThesis),
    create: vi.fn().mockImplementation((dto) => dto),
    save: vi.fn().mockImplementation((t) => Promise.resolve({ id: 1, ...t })),
    remove: vi.fn().mockResolvedValue(mockThesis),
    createQueryBuilder: vi.fn(() => ({
      andWhere: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      addOrderBy: vi.fn().mockReturnThis(),
      getMany: vi.fn().mockResolvedValue([mockThesis]),
    })),
  };

  const mockMultimediaRepo = {
    count: vi.fn().mockResolvedValue(1),
    find: vi.fn().mockResolvedValue([mockMultimedia]),
    findOne: vi.fn().mockResolvedValue(mockMultimedia),
    create: vi.fn().mockImplementation((dto) => dto),
    save: vi.fn().mockImplementation((m) => Promise.resolve({ id: 1, ...m })),
    remove: vi.fn().mockResolvedValue(mockMultimedia),
    createQueryBuilder: vi.fn(() => ({
      andWhere: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      addOrderBy: vi.fn().mockReturnThis(),
      getMany: vi.fn().mockResolvedValue([mockMultimedia]),
    })),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AcademicResourcesService,
        {
          provide: getRepositoryToken(Thesis),
          useValue: mockThesisRepo,
        },
        {
          provide: getRepositoryToken(MultimediaItem),
          useValue: mockMultimediaRepo,
        },
      ],
    }).compile();

    service = module.get<AcademicResourcesService>(AcademicResourcesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('gets theses stats accurately', async () => {
    const stats = await service.getThesesStats();
    expect(stats.total).toBe(1);
    expect(stats.publicCount).toBe(1);
  });

  it('records on-site loan for multimedia item', async () => {
    const updated = await service.recordOnSiteLoan(1);
    expect(updated.onSiteLoanCount).toBe(6);
  });
});

