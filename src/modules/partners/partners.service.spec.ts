import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { PartnersService } from './partners.service';
import { BookDonation, LibraryPartner, PartnerType } from './entities/partner.entity';
import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('PartnersService', () => {
  let service: PartnersService;

  const mockPartner = {
    id: 1,
    name: 'Hội Cựu Sinh Viên',
    type: PartnerType.INDIVIDUAL_ALUMNI,
    totalDonatedBooks: 100,
    totalDonatedCash: 20000000,
    status: 'ACTIVE',
  };

  const mockPartnerRepo = {
    count: vi.fn().mockResolvedValue(1),
    find: vi.fn().mockResolvedValue([mockPartner]),
    findOne: vi.fn().mockResolvedValue(mockPartner),
    create: vi.fn().mockImplementation((dto) => dto),
    save: vi.fn().mockImplementation((partner) => Promise.resolve({ id: 1, ...partner })),
    remove: vi.fn().mockResolvedValue(mockPartner),
    createQueryBuilder: vi.fn(() => ({
      andWhere: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      getMany: vi.fn().mockResolvedValue([mockPartner]),
    })),
  };

  const mockDonationRepo = {
    count: vi.fn().mockResolvedValue(1),
    find: vi.fn().mockResolvedValue([]),
    findOne: vi.fn().mockResolvedValue({
      id: 1,
      partnerId: 1,
      itemTitle: '100 sách',
      quantity: 100,
      receiptNumber: 'REC-2026-001',
      donationDate: new Date(),
    }),
    create: vi.fn().mockImplementation((dto) => dto),
    save: vi.fn().mockImplementation((don) => Promise.resolve({ id: 1, ...don })),
    delete: vi.fn().mockResolvedValue({ affected: 1 }),
    createQueryBuilder: vi.fn(() => ({
      andWhere: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      getMany: vi.fn().mockResolvedValue([]),
    })),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PartnersService,
        {
          provide: getRepositoryToken(LibraryPartner),
          useValue: mockPartnerRepo,
        },
        {
          provide: getRepositoryToken(BookDonation),
          useValue: mockDonationRepo,
        },
      ],
    }).compile();

    service = module.get<PartnersService>(PartnersService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('gets stats accurately', async () => {
    const stats = await service.getStats();
    expect(stats.totalPartners).toBe(1);
    expect(stats.totalDonatedBooks).toBe(100);
    expect(stats.totalDonatedCash).toBe(20000000);
  });

  it('creates donation and updates partner totals', async () => {
    const donation = await service.createDonation({
      partnerId: 1,
      itemTitle: '50 sách AI',
      quantity: 50,
      estimatedValue: 10000000,
    });
    expect(donation.receiptNumber).toMatch(/^REC-/);
  });
});

