import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { TutorialsService } from './tutorials.service';
import { LibraryTutorial, TutorialCategory, TutorialFormat, TutorialStatus } from './entities/tutorial.entity';
import { RegistrationStatus, TutorialRegistration } from './entities/tutorial-registration.entity';
import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('TutorialsService', () => {
  let service: TutorialsService;
  let mockTutorialRepo: any;
  let mockRegRepo: any;

  beforeEach(async () => {
    mockTutorialRepo = {
      count: vi.fn().mockResolvedValue(1),
      countBy: vi.fn().mockResolvedValue(1),
      findOneBy: vi.fn().mockImplementation(({ id }) =>
        Promise.resolve(
          id === 1
            ? {
                id: 1,
                title: 'Hướng dẫn OPAC',
                maxSeats: 50,
                registeredCount: 5,
                viewCount: 10,
              }
            : null,
        ),
      ),
      create: vi.fn().mockImplementation((dto) => ({ id: 1, ...dto })),
      save: vi.fn().mockImplementation((item) => Promise.resolve({ id: item.id || 1, ...item })),
      remove: vi.fn().mockResolvedValue({}),
      createQueryBuilder: vi.fn().mockReturnValue({
        andWhere: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        addOrderBy: vi.fn().mockReturnThis(),
        getMany: vi.fn().mockResolvedValue([{ id: 1, title: 'Hướng dẫn OPAC' }]),
        select: vi.fn().mockReturnThis(),
        getRawOne: vi.fn().mockResolvedValue({ sum: '100' }),
      }),
    };

    mockRegRepo = {
      create: vi.fn().mockImplementation((dto) => ({ id: 1, ...dto })),
      save: vi.fn().mockImplementation((dto) => Promise.resolve({ id: 1, ...dto })),
      count: vi.fn().mockResolvedValue(5),
      find: vi.fn().mockResolvedValue([{ id: 1, fullName: 'Sinh viên A' }]),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TutorialsService,
        { provide: getRepositoryToken(LibraryTutorial), useValue: mockTutorialRepo },
        { provide: getRepositoryToken(TutorialRegistration), useValue: mockRegRepo },
      ],
    }).compile();

    service = module.get<TutorialsService>(TutorialsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('registers a user for a tutorial workshop', async () => {
    const res = await service.register(1, {
      fullName: 'Đoàn Văn C',
      email: 'c@student.edu.vn',
      phone: '0912345678',
    });
    expect(res.success).toBe(true);
    expect(res.registration).toBeDefined();
  });
});

