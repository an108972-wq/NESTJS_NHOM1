import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { FeedbackService } from './feedback.service';
import { FeedbackCategory, FeedbackStatus, ReaderFeedback } from './entities/feedback.entity';
import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('FeedbackService', () => {
  let service: FeedbackService;
  let mockFeedbackRepo: any;

  beforeEach(async () => {
    mockFeedbackRepo = {
      count: vi.fn().mockResolvedValue(1),
      countBy: vi.fn().mockResolvedValue(1),
      findOne: vi.fn().mockImplementation(({ where: { id } }) =>
        Promise.resolve(id === 1 ? { id: 1, title: 'Ý kiến bổ sung sách', status: FeedbackStatus.PENDING } : null),
      ),
      create: vi.fn().mockImplementation((dto) => ({ id: 1, ...dto })),
      save: vi.fn().mockImplementation((item) => Promise.resolve({ id: item.id || 1, ...item })),
      remove: vi.fn().mockResolvedValue({}),
      createQueryBuilder: vi.fn().mockReturnValue({
        leftJoinAndSelect: vi.fn().mockReturnThis(),
        andWhere: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        getMany: vi.fn().mockResolvedValue([{ id: 1, title: 'Ý kiến bổ sung sách' }]),
        select: vi.fn().mockReturnThis(),
        getRawOne: vi.fn().mockResolvedValue({ avg: '4.8' }),
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FeedbackService,
        { provide: getRepositoryToken(ReaderFeedback), useValue: mockFeedbackRepo },
      ],
    }).compile();

    service = module.get<FeedbackService>(FeedbackService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('submits a feedback', async () => {
    const res = await service.create({
      senderName: 'Nguyễn Văn B',
      title: 'Đề xuất sách mới',
      content: 'Cần thêm sách AI',
      category: FeedbackCategory.BOOK_REQUEST,
    });
    expect(res).toBeDefined();
    expect(res.senderName).toBe('Nguyễn Văn B');
  });

  it('responds to a feedback', async () => {
    const res = await service.respond(1, {
      response: 'Đã giải quyết yêu cầu',
      status: FeedbackStatus.RESOLVED,
    }, 'Thủ thư A');
    expect(res.status).toBe(FeedbackStatus.RESOLVED);
    expect(res.response).toBe('Đã giải quyết yêu cầu');
  });
});

