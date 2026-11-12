import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { AcquisitionsService } from './acquisitions.service';
import { PurchaseRequest, PurchaseRequestStatus } from './entities/purchase-request.entity';
import { PurchaseOrder } from './entities/purchase-order.entity';
import { PurchaseOrderItem } from './entities/purchase-order-item.entity';
import { PurchaseRequestVote } from './entities/purchase-request-vote.entity';
import { Book } from '../books/entities/book.entity';
import { LibraryBudget } from './entities/library-budget.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { User } from '../users/entities/user.entity';

describe('AcquisitionsService', () => {
  let service: AcquisitionsService;
  let requestRepo: any;
  let orderRepo: any;
  let orderItemRepo: any;
  let voteRepo: any;
  let bookRepo: any;
  let notificationsService: any;

  beforeEach(async () => {
    requestRepo = {
      create: vi.fn((data) => data),
      save: vi.fn(async (data) => ({ ...data, id: data.id || 1 })),
      findOne: vi.fn(),
      find: vi.fn(),
      createQueryBuilder: vi.fn(),
    };

    orderRepo = {
      create: vi.fn((data) => data),
      save: vi.fn(async (data) => ({ ...data, id: 1 })),
      find: vi.fn().mockResolvedValue([]),
    };

    orderItemRepo = {
      create: vi.fn((data) => data),
    };

    voteRepo = {
      create: vi.fn((data) => data),
      save: vi.fn(async (data) => data),
      findOne: vi.fn(),
      remove: vi.fn(),
    };

    bookRepo = {
      findOne: vi.fn(),
      createQueryBuilder: vi.fn(),
    };

    notificationsService = {
      sendAcquisitionNotification: vi.fn().mockResolvedValue({ id: 1 }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AcquisitionsService,
        { provide: getRepositoryToken(PurchaseRequest), useValue: requestRepo },
        { provide: getRepositoryToken(PurchaseOrder), useValue: orderRepo },
        { provide: getRepositoryToken(PurchaseOrderItem), useValue: orderItemRepo },
        { provide: getRepositoryToken(PurchaseRequestVote), useValue: voteRepo },
        { provide: getRepositoryToken(Book), useValue: bookRepo },
        { provide: getRepositoryToken(LibraryBudget), useValue: {} },
        { provide: NotificationsService, useValue: notificationsService },
      ],
    }).compile();

    service = module.get<AcquisitionsService>(AcquisitionsService);
  });

  it('creates purchase request with initial vote', async () => {
    const user = { id: 10, username: 'student' } as User;
    const dto = { title: 'Clean Architecture', author: 'Robert C. Martin' };

    const result = await service.create(user, dto as any);

    expect(result.votesCount).toBe(1);
    expect(voteRepo.save).toHaveBeenCalled();
  });

  it('toggles vote up and down for a request', async () => {
    const user = { id: 10, username: 'student' } as User;
    const request = { id: 1, title: 'Clean Code', votesCount: 1 } as PurchaseRequest;
    requestRepo.findOne.mockResolvedValue(request);

    // Vote exists -> unvote
    voteRepo.findOne.mockResolvedValue({ id: 5 });
    const unvoteRes = await service.toggleVote(1, user);
    expect(unvoteRes.voted).toBe(false);
    expect(unvoteRes.votesCount).toBe(0);
    expect(voteRepo.remove).toHaveBeenCalled();

    // Vote does not exist -> vote
    voteRepo.findOne.mockResolvedValue(null);
    const voteRes = await service.toggleVote(1, user);
    expect(voteRes.voted).toBe(true);
    expect(voteRes.votesCount).toBe(1);
    expect(voteRepo.save).toHaveBeenCalled();
  });

  it('detects duplicate book in library inventory by ISBN', async () => {
    bookRepo.findOne.mockResolvedValue({
      id: 99,
      title: 'Design Patterns',
      author: 'GoF',
      availableCopies: 3,
      totalCopies: 4,
    });

    const check = await service.checkDuplicateBook('Design Patterns', 'GoF', '978-0201633610');
    expect(check.isDuplicate).toBe(true);
    expect(check.matchedBook?.availableCopies).toBe(3);
  });

  it('groups approved requests by publisher', async () => {
    requestRepo.find.mockResolvedValue([
      { id: 1, title: 'Book 1', publisher: 'NXB Trẻ', estimatedPrice: 100000, status: PurchaseRequestStatus.APPROVED },
      { id: 2, title: 'Book 2', publisher: 'NXB Trẻ', estimatedPrice: 150000, status: PurchaseRequestStatus.APPROVED },
      { id: 3, title: 'Book 3', publisher: 'NXB Kim Đồng', estimatedPrice: 80000, status: PurchaseRequestStatus.APPROVED },
    ]);

    const groups = await service.getApprovedGroups();
    expect(groups.length).toBe(2);
    const tre = groups.find((g) => g.publisher === 'NXB Trẻ');
    expect(tre?.requestCount).toBe(2);
    expect(tre?.totalEstimatedPrice).toBe(250000);
  });

  it('sends automated notification to reader when request status updates', async () => {
    const user = { id: 10, email: 'reader@example.com' } as User;
    const request = {
      id: 1,
      title: 'Refactoring',
      user,
      status: PurchaseRequestStatus.PENDING,
    } as PurchaseRequest;
    requestRepo.findOne.mockResolvedValue(request);

    await service.update(1, { status: PurchaseRequestStatus.APPROVED });

    expect(notificationsService.sendAcquisitionNotification).toHaveBeenCalledWith(
      user,
      'Đề xuất mua sách được phê duyệt',
      expect.stringContaining('Refactoring'),
    );
  });
});

