import { Test, TestingModule } from '@nestjs/testing';
import { BooksController } from './books.controller';
import { BooksService } from './books.service';
import { vi } from 'vitest';
import { BadRequestException } from '@nestjs/common';

describe('BooksController', () => {
  let controller: BooksController;
  let findAll: ReturnType<typeof vi.fn>;
  let findLocations: ReturnType<typeof vi.fn>;
  let updateCopy: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    findAll = vi.fn().mockResolvedValue([]);
    findLocations = vi.fn().mockResolvedValue({ shelves: [], floors: [], aisles: [] });
    updateCopy = vi.fn().mockResolvedValue({ id: 8 });
    const module: TestingModule = await Test.createTestingModule({
      controllers: [BooksController],
      providers: [
        {
          provide: BooksService,
          useValue: {
            findAll,
            findLocations,
            updateCopy,
          },
        },
      ],
    }).compile();

    controller = module.get<BooksController>(BooksController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('passes advanced search filters to the books service', async () => {
    await controller.search('database', 8, 'available', 2, 5, 2024, 'Shelf A', '2', 'North');

    expect(findAll).toHaveBeenCalledWith(
      2,
      5,
      'database',
      8,
      'available',
      2024,
      'Shelf A',
      '2',
      'North',
    );
  });

  it('returns available shelf, floor, and aisle filter values', async () => {
    const locations = { shelves: ['A'], floors: ['1'], aisles: ['North'] };
    findLocations.mockResolvedValue(locations);

    await expect(controller.findLocations()).resolves.toEqual(locations);
    expect(findLocations).toHaveBeenCalledOnce();
  });

  it('rejects unsupported inventory statuses', () => {
    expect(() => controller.search('', undefined, 'borrowed' as never)).toThrow(
      BadRequestException,
    );
    expect(findAll).not.toHaveBeenCalled();
  });

  it('forwards copy updates to the books service', async () => {
    const dto = { status: 'DAMAGED' } as never;
    await controller.updateCopy(4, 8, dto);

    expect(updateCopy).toHaveBeenCalledWith(4, 8, dto);
  });
});