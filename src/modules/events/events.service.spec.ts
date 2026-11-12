import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { EventsService } from './events.service';
import { EventStatus, EventType, LibraryEvent, TargetAudience } from './entities/library-event.entity';
import { User } from '../users/entities/user.entity';
import { Notification } from '../notifications/entities/notification.entity';
import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('EventsService', () => {
  let service: EventsService;
  let mockEventRepo: any;
  let mockUserRepo: any;
  let mockNotificationRepo: any;

  beforeEach(async () => {
    mockEventRepo = {
      count: vi.fn().mockResolvedValue(1),
      countBy: vi.fn().mockResolvedValue(1),
      find: vi.fn().mockResolvedValue([]),
      findOneBy: vi.fn().mockImplementation(({ id }) =>
        Promise.resolve(id === 1 ? { id: 1, title: 'Triển lãm sách', content: 'Nội dung triển lãm sách', targetAudience: TargetAudience.ALL, viewCount: 0 } : null),
      ),
      create: vi.fn().mockImplementation((dto) => ({ id: 1, ...dto })),
      save: vi.fn().mockImplementation((item) => Promise.resolve({ id: item.id || 1, ...item })),
      remove: vi.fn().mockResolvedValue({}),
      createQueryBuilder: vi.fn().mockReturnValue({
        andWhere: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        addOrderBy: vi.fn().mockReturnThis(),
        getMany: vi.fn().mockResolvedValue([{ id: 1, title: 'Triển lãm sách' }]),
        select: vi.fn().mockReturnThis(),
        getRawOne: vi.fn().mockResolvedValue({ sum: '150' }),
      }),
    };

    const qbUser = {
      where: vi.fn().mockReturnThis(),
      andWhere: vi.fn().mockReturnThis(),
      getMany: vi.fn().mockResolvedValue([{ id: 1, fullName: 'Sinh viên A' }]),
    };
    mockUserRepo = {
      createQueryBuilder: vi.fn().mockReturnValue(qbUser),
    };

    mockNotificationRepo = {
      create: vi.fn().mockImplementation((dto) => dto),
      save: vi.fn().mockResolvedValue({ id: 1 }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EventsService,
        { provide: getRepositoryToken(LibraryEvent), useValue: mockEventRepo },
        { provide: getRepositoryToken(User), useValue: mockUserRepo },
        { provide: getRepositoryToken(Notification), useValue: mockNotificationRepo },
      ],
    }).compile();

    service = module.get<EventsService>(EventsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('creates an event', async () => {
    const res = await service.create({
      title: 'Hội sách 2026',
      content: 'Nội dung hội sách',
      type: EventType.EVENT,
    });
    expect(res).toBeDefined();
    expect(res.title).toBe('Hội sách 2026');
  });

  it('broadcasts an announcement to readers', async () => {
    const res = await service.broadcast(1, { targetAudience: TargetAudience.ALL });
    expect(res.success).toBe(true);
    expect(res.sentCount).toBe(1);
  });
});
