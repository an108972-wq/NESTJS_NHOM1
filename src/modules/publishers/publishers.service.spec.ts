import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PublishersService } from './publishers.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';

describe('PublishersService', () => {
  let service: PublishersService;
  let publisherRepo: any;
  let bookRepo: any;
  let orderRepo: any;

  beforeEach(() => {
    publisherRepo = {
      findOneBy: vi.fn(),
      create: vi.fn((dto) => dto),
      save: vi.fn((data) => Promise.resolve({ id: 1, ...data })),
      remove: vi.fn((data) => Promise.resolve(data)),
      createQueryBuilder: vi.fn(),
    };

    bookRepo = {
      count: vi.fn().mockResolvedValue(0),
    };

    orderRepo = {
      createQueryBuilder: vi.fn(),
      find: vi.fn().mockResolvedValue([]),
    };

    service = new PublishersService(publisherRepo, bookRepo, orderRepo);
  });

  it('creates a new publisher when name is unique', async () => {
    publisherRepo.findOneBy.mockResolvedValue(null);
    const result = await service.create({
      name: 'NXB Trẻ',
      taxCode: '0300123456',
      contactPerson: 'Trần Văn B',
      qualityRating: 5,
      deliverySpeed: 'FAST',
      discountRate: 20,
    });

    expect(publisherRepo.save).toHaveBeenCalled();
    expect(result.name).toBe('NXB Trẻ');
  });

  it('throws BadRequestException when creating a duplicate publisher name', async () => {
    publisherRepo.findOneBy.mockResolvedValue({ id: 1, name: 'NXB Trẻ' });
    await expect(service.create({ name: 'NXB Trẻ' })).rejects.toThrow(
      BadRequestException,
    );
  });

  it('throws NotFoundException when findOne cannot find the publisher', async () => {
    publisherRepo.findOneBy.mockResolvedValue(null);
    await expect(service.findOne(999)).rejects.toThrow(NotFoundException);
  });

  it('returns budget summary and associated purchase orders', async () => {
    publisherRepo.findOneBy.mockResolvedValue({ id: 1, name: 'NXB Kim Đồng' });
    orderRepo.find.mockResolvedValue([
      {
        id: 1,
        orderCode: 'PO-2026-001',
        totalAmount: 5000000,
        status: 'COMPLETED',
        items: [],
      },
    ]);
    bookRepo.count.mockResolvedValue(12);

    const summary = await service.getBudgetSummary(1);
    expect(summary.bookCount).toBe(12);
    expect(summary.totalSpent).toBe(5000000);
    expect(summary.orderCount).toBe(1);
  });
});

