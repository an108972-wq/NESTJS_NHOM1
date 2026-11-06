import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Category } from '../categories/entities/category.entity';
import { BookCopy, BookCopyStatus } from './entities/book-copy.entity';
import { BooksService } from './books.service';
import { Book } from './entities/book.entity';
import { BorrowRecord } from '../borrow-records/entities/borrow-record.entity';
import { Publisher } from '../publishers/entities/publisher.entity';
import { vi } from 'vitest';
import { DataSource } from 'typeorm';
import { ReservationsService } from '../reservations/reservations.service';

describe('BooksService', () => {
  let service: BooksService;
  let bookRepository: any;
  let copyRepository: any;
  let transactionManager: any;
  let assignNextWaitingReservation: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    const createdBook = { id: 4, title: 'Book', totalCopies: 2, availableCopies: 2 };
    bookRepository = {
      create: vi.fn((data) => data),
      save: vi.fn(async (data) => ({ ...data, id: 4 })),
      findOne: vi.fn().mockResolvedValue(createdBook),
    };
    copyRepository = {
      create: vi.fn((data) => data),
      save: vi.fn(async (data) => data),
      count: vi.fn().mockResolvedValue(1),
      find: vi.fn().mockResolvedValue([]),
    };
    transactionManager = {
      findOne: vi.fn(),
      save: vi.fn(async (data) => data),
    };
    assignNextWaitingReservation = vi.fn().mockResolvedValue(false);
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BooksService,
        { provide: getRepositoryToken(Book), useValue: bookRepository },
        { provide: getRepositoryToken(BookCopy), useValue: copyRepository },
        { provide: getRepositoryToken(Category), useValue: {} },
        { provide: getRepositoryToken(BorrowRecord), useValue: {} },
        { provide: getRepositoryToken(Publisher), useValue: {} },
        {
          provide: DataSource,
          useValue: { transaction: vi.fn((callback) => callback(transactionManager)) },
        },
        {
          provide: ReservationsService,
          useValue: { assignNextWaitingReservation },
        },
      ],
    }).compile();

    service = module.get<BooksService>(BooksService);
  });

  it('creates unique barcode records for each copy', async () => {
    await service.create({
      title: 'Book',
      author: 'Author',
      isbn: '9780000000000',
      totalCopies: 2,
      availableCopies: 2,
    });

    const copies = copyRepository.save.mock.calls[0][0] as BookCopy[];
    expect(copies).toHaveLength(2);
    expect(copies.every((copy) => copy.status === BookCopyStatus.AVAILABLE)).toBe(true);
    expect(new Set(copies.map((copy) => copy.barcode)).size).toBe(2);
  });

  it('imports valid CSV rows and reports invalid rows individually', async () => {
    const create = vi
      .spyOn(service, 'create')
      .mockImplementation(async (dto) => ({ ...dto, id: 21 }) as Book);
    const csv = [
      'title,author,isbn,totalCopies,description',
      '"A Book, With Commas",A Writer,9780000000000,2,"A short description"',
      'x,A Writer,9780000000001,1,',
    ].join('\r\n');

    const result = await service.importBooks(Buffer.from(`\uFEFF${csv}`), 'csv');

    expect(result).toMatchObject({ total: 2, created: 1, failed: 1 });
    expect(result.rows[0]).toMatchObject({ status: 'created', title: 'A Book, With Commas' });
    expect(result.rows[1]).toMatchObject({ status: 'failed', row: 3 });
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'A Book, With Commas', totalCopies: 2 }),
    );
  });

  it('generates printable Code 128 barcode images for copy labels', async () => {
    const copy = { id: 9, barcode: 'COPY-9' } as BookCopy;
    copyRepository.find.mockResolvedValue([copy]);

    const labels = await service.getCopyLabels(4);

    expect(labels).toHaveLength(1);
    expect(labels[0].barcode).toBe('COPY-9');
    expect(labels[0].image).toMatch(/^data:image\/png;base64,/);
  });

  it('returns unique shelf, floor, and aisle filter values from books and copies', async () => {
    bookRepository.find = vi.fn().mockResolvedValue([
      { shelf: 'A2', floor: '1', aisle: 'North' },
      { shelf: 'A2', floor: '2', aisle: null },
    ]);
    copyRepository.find.mockResolvedValue([
      { shelf: 'B1', floor: '1', aisle: 'South' },
      { shelf: ' ', floor: null, aisle: 'North' },
    ]);

    await expect(service.findLocations()).resolves.toEqual({
      shelves: ['A2', 'B1'],
      floors: ['1', '2'],
      aisles: ['North', 'South'],
    });
  });

  it('combines shelf, floor, and aisle filters in the book search query', async () => {
    const query = {
      leftJoinAndSelect: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      andWhere: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      skip: vi.fn().mockReturnThis(),
      take: vi.fn().mockReturnThis(),
      getManyAndCount: vi.fn().mockResolvedValue([[], 0]),
    };
    bookRepository.createQueryBuilder = vi.fn().mockReturnValue(query);

    await service.findAll(1, 9, '', undefined, undefined, undefined, 'A2', '1', 'North');

    expect(query.andWhere).toHaveBeenCalledWith(
      '(copy.shelf = :shelf OR book.shelf = :shelf)',
      { shelf: 'A2' },
    );
    expect(query.andWhere).toHaveBeenCalledWith(
      '(copy.floor = :floor OR book.floor = :floor)',
      { floor: '1' },
    );
    expect(query.andWhere).toHaveBeenCalledWith(
      '(copy.aisle = :aisle OR book.aisle = :aisle)',
      { aisle: 'North' },
    );
  });

  it('rejects available copy counts greater than inventory', async () => {
    await expect(
      service.create({
        title: 'Book',
        author: 'Author',
        isbn: '9780000000000',
        totalCopies: 1,
        availableCopies: 2,
      }),
    ).rejects.toThrow();
    expect(bookRepository.save).not.toHaveBeenCalled();
  });

  it('updates copy status and keeps the available inventory count in sync', async () => {
    const book = { id: 4, availableCopies: 2, totalCopies: 3 } as Book;
    const copy = { id: 9, book, status: BookCopyStatus.AVAILABLE } as BookCopy;
    transactionManager.findOne.mockImplementation((entity) =>
      Promise.resolve(entity === Book ? book : copy),
    );

    await service.updateCopy(4, 9, { status: BookCopyStatus.DAMAGED });

    expect(copy.status).toBe(BookCopyStatus.DAMAGED);
    expect(book.availableCopies).toBe(1);
    expect(transactionManager.save).toHaveBeenCalledWith(copy);
    expect(transactionManager.save).toHaveBeenCalledWith(book);
  });

  it('does not allow manually changing a copy managed by an active loan', async () => {
    const book = { id: 4, availableCopies: 1, totalCopies: 3 } as Book;
    const copy = { id: 9, book, status: BookCopyStatus.BORROWED } as BookCopy;
    transactionManager.findOne.mockImplementation((entity) =>
      Promise.resolve(entity === Book ? book : copy),
    );

    await expect(
      service.updateCopy(4, 9, { status: BookCopyStatus.DAMAGED }),
    ).rejects.toThrow('được quản lý bởi phiếu mượn');
    expect(transactionManager.save).not.toHaveBeenCalled();
  });

  it('tracks maintenance copies as unavailable inventory', async () => {
    const book = { id: 4, availableCopies: 2, totalCopies: 3 } as Book;
    const copy = { id: 10, book, status: BookCopyStatus.AVAILABLE } as BookCopy;
    transactionManager.findOne.mockImplementation((entity) =>
      Promise.resolve(entity === Book ? book : copy),
    );

    await service.updateCopy(4, 10, { status: BookCopyStatus.MAINTENANCE });

    expect(copy.status).toBe(BookCopyStatus.MAINTENANCE);
    expect(book.availableCopies).toBe(1);
  });

  it('does not allow a disposed copy to return to active inventory', async () => {
    const book = { id: 4, availableCopies: 1, totalCopies: 3 } as Book;
    const copy = { id: 11, book, status: BookCopyStatus.DISPOSED } as BookCopy;
    transactionManager.findOne.mockImplementation((entity) =>
      Promise.resolve(entity === Book ? book : copy),
    );

    await expect(
      service.updateCopy(4, 11, { status: BookCopyStatus.AVAILABLE }),
    ).rejects.toThrow('đã thanh lý không thể được khôi phục');
    expect(transactionManager.save).not.toHaveBeenCalled();
  });
});
