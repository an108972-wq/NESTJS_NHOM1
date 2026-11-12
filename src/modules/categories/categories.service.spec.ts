import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { vi } from 'vitest';
import { Category } from './entities/category.entity';
import { Book } from '../books/entities/book.entity';
import { CategoriesService } from './categories.service.js';

describe('CategoriesService', () => {
  let service: CategoriesService;
  const mockCategoryRepo = {
    find: vi.fn(),
    findOne: vi.fn(),
    findOneBy: vi.fn(),
    create: vi.fn((data) => data),
    save: vi.fn(async (data) => ({ id: 1, ...data })),
    remove: vi.fn(async (data) => data),
    count: vi.fn(),
    delete: vi.fn().mockResolvedValue({ affected: 1 }),
    createQueryBuilder: vi.fn(),
  };
  const mockBookRepo = {
    count: vi.fn(),
    createQueryBuilder: vi.fn(),
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CategoriesService,
        { provide: getRepositoryToken(Category), useValue: mockCategoryRepo },
        { provide: getRepositoryToken(Book), useValue: mockBookRepo },
      ],
    }).compile();

    service = module.get<CategoriesService>(CategoriesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('rejects deleting a category when books belong to it', async () => {
    mockCategoryRepo.findOne.mockResolvedValue({ id: 1, name: 'CNTT' });
    mockBookRepo.count.mockResolvedValue(3);

    await expect(service.remove(1)).rejects.toThrow(BadRequestException);
    expect(mockCategoryRepo.remove).not.toHaveBeenCalled();
  });

  it('rejects deleting a category when child categories exist', async () => {
    mockCategoryRepo.findOne.mockResolvedValue({ id: 1, name: 'CNTT' });
    mockBookRepo.count.mockResolvedValue(0);
    mockCategoryRepo.count.mockResolvedValue(2);

    await expect(service.remove(1)).rejects.toThrow(BadRequestException);
    expect(mockCategoryRepo.remove).not.toHaveBeenCalled();
  });

  it('allows deleting an empty category without books or children', async () => {
    const cat = { id: 1, name: 'Empty Cat' };
    mockCategoryRepo.findOne.mockResolvedValue(cat);
    mockBookRepo.count.mockResolvedValue(0);
    mockCategoryRepo.count.mockResolvedValue(0);

    const result = await service.remove(1);
    expect(result).toEqual({ message: 'Đã xóa thể loại thành công' });
    expect(mockCategoryRepo.remove).toHaveBeenCalledWith(cat);
  });

  it('rejects setting category parent to itself', async () => {
    mockCategoryRepo.findOne.mockResolvedValue({ id: 5, name: 'Math' });

    await expect(service.update(5, { parentId: 5 })).rejects.toThrow(BadRequestException);
  });
  it('merges source categories into target category and moves books', async () => {
    const qbMock = {
      update: vi.fn().mockReturnThis(),
      set: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      execute: vi.fn().mockResolvedValue({ affected: 5 }),
    };
    mockBookRepo.createQueryBuilder.mockReturnValue(qbMock);
    mockCategoryRepo.createQueryBuilder.mockReturnValue(qbMock);
    mockCategoryRepo.findOne.mockResolvedValue({ id: 10, name: 'Công nghệ thông tin' });
    mockCategoryRepo.find.mockResolvedValue([
      { id: 11, name: 'Lập trình C' },
      { id: 12, name: 'Lập trình Java' },
    ]);
    mockBookRepo.count.mockResolvedValue(5);

    const result = await service.mergeCategories({
      sourceCategoryIds: [11, 12],
      targetCategoryId: 10,
      deleteSourceCategories: true,
    });

    expect(result.success).toBe(true);
    expect(result.movedBooksCount).toBe(5);
    expect(mockCategoryRepo.delete).toHaveBeenCalled();
  });

  it('moves all books from one category to another without deleting category', async () => {
    const qbMock = {
      update: vi.fn().mockReturnThis(),
      set: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      execute: vi.fn().mockResolvedValue({ affected: 3 }),
    };
    mockBookRepo.createQueryBuilder.mockReturnValue(qbMock);
    mockCategoryRepo.findOne.mockImplementation(async ({ where }) => {
      if (where.id === 1) return { id: 1, name: 'Nguồn' };
      if (where.id === 2) return { id: 2, name: 'Đích' };
      return null;
    });
    mockBookRepo.count.mockResolvedValue(3);

    const result = await service.moveBooks(1, 2);

    expect(result.success).toBe(true);
    expect(result.movedBooksCount).toBe(3);
    expect(mockCategoryRepo.delete).not.toHaveBeenCalled();
  });
});