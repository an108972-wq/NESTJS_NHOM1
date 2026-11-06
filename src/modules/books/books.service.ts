import { randomUUID } from 'crypto';
import {
  BadRequestException,
  HttpException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';
import * as bwipjs from 'bwip-js';
import readXlsxFile = require('read-excel-file/node');
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { Category } from '../categories/entities/category.entity';
import { BookCopy, BookCopyStatus } from './entities/book-copy.entity';
import { Book } from './entities/book.entity';
import { CreateBookDto } from './dto/create-book.dto';
import { UpdateBookDto } from './dto/update-book.dto';
import { UpdateBookCopyDto } from './dto/update-book-copy.dto';
import { BorrowRecord, BorrowStatus } from '../borrow-records/entities/borrow-record.entity';
import { Publisher } from '../publishers/entities/publisher.entity';
import { ReservationsService } from '../reservations/reservations.service';

@Injectable()
export class BooksService {
  constructor(
    @InjectRepository(Book)
    private readonly bookRepository: Repository<Book>,
    @InjectRepository(BookCopy)
    private readonly copyRepository: Repository<BookCopy>,
    @InjectRepository(Category)
    private readonly categoryRepository: Repository<Category>,
    @InjectRepository(BorrowRecord)
    private readonly borrowRepository: Repository<BorrowRecord>,
    @InjectRepository(Publisher)
    private readonly publisherRepository: Repository<Publisher>,
    private readonly dataSource: DataSource,
    private readonly reservationsService: ReservationsService,
  ) {}

  async create(dto: CreateBookDto) {
    const totalCopies = dto.totalCopies ?? 1;
    const availableCopies = dto.availableCopies ?? totalCopies;
    this.validateCopyCounts(totalCopies, availableCopies);
    const category = dto.categoryId
      ? await this.categoryRepository.findOneBy({ id: dto.categoryId })
      : undefined;
    if (dto.categoryId && !category) throw new NotFoundException('Không tìm thấy thể loại');
    const publisher = dto.publisherId
      ? await this.publisherRepository.findOneBy({ id: dto.publisherId })
      : undefined;
    if (dto.publisherId && !publisher) throw new NotFoundException('Không tìm thấy nhà xuất bản');

    const { categoryId: _categoryId, publisherId: _publisherId, ...bookData } = dto;
    const book = await this.bookRepository.save(
      this.bookRepository.create({ ...bookData, totalCopies, availableCopies, category, publisher }),
    );
    const copies = Array.from({ length: totalCopies }, (_, index) =>
      this.createCopy(
        book,
        index < availableCopies ? BookCopyStatus.AVAILABLE : BookCopyStatus.DAMAGED,
      ),
    );
    await this.copyRepository.save(copies);
    return this.findOne(book.id);
  }

  async importBooks(buffer: Buffer, format: 'csv' | 'xlsx') {
    let rows: unknown[][];
    try {
      if (format === 'xlsx') {
        const workbook = await readXlsxFile(buffer);
        rows = workbook[0]?.rows ?? [];
      } else {
        rows = this.parseCsv(buffer.toString('utf8'));
      }
    } catch {
      throw new BadRequestException('Tệp không đúng định dạng hoặc bị lỗi');
    }
    if (!rows.length) {
      throw new BadRequestException('Tệp không có bảng dữ liệu');
    }
    if (rows.length > 501) {
      throw new BadRequestException('Mỗi lần chỉ có thể nhập tối đa 500 đầu sách');
    }

    const headers = rows[0].map((value) => String(value ?? '').trim());
    const results: Array<{
      row: number;
      status: 'created' | 'failed';
      title?: string;
      bookId?: number;
      errors?: string[];
    }> = [];
    for (let rowIndex = 1; rowIndex < rows.length; rowIndex += 1) {
      const row = rows[rowIndex];
      const values: Record<string, string> = {};
      row.forEach((cell, column) => {
        const header = headers[column];
        const value = String(cell ?? '').trim();
        if (header && value) values[header] = value;
      });
      if (!Object.values(values).some(Boolean)) continue;

      const dto = plainToInstance(CreateBookDto, values, { enableImplicitConversion: true });
      const validationErrors = await validate(dto);
      const messages = validationErrors.flatMap((error) =>
        Object.values(error.constraints ?? {}),
      );
      if (messages.length) {
        results.push({
          row: rowIndex + 1,
          status: 'failed',
          title: values.title,
          errors: messages,
        });
        continue;
      }

      try {
        const book = await this.create(dto);
        results.push({
          row: rowIndex + 1,
          status: 'created',
          title: book.title,
          bookId: book.id,
        });
      } catch (error) {
        if (!(error instanceof HttpException)) throw error;
        const response = error.getResponse();
        const message =
          typeof response === 'string'
            ? response
            : response && typeof response === 'object' && 'message' in response
              ? (response as { message: unknown }).message
              : error.message;
        results.push({
          row: rowIndex + 1,
          status: 'failed',
          title: values.title,
          errors: Array.isArray(message) ? message.map(String) : [String(message)],
        });
      }
    }

    const created = results.filter((result) => result.status === 'created').length;
    return {
      total: results.length,
      created,
      failed: results.length - created,
      rows: results,
    };
  }

  private parseCsv(text: string) {
    const rows: string[][] = [];
    let row: string[] = [];
    let value = '';
    let quoted = false;
    const input = text.replace(/^\uFEFF/, '');
    for (let index = 0; index < input.length; index += 1) {
      const character = input[index];
      if (quoted) {
        if (character === '"' && input[index + 1] === '"') {
          value += '"';
          index += 1;
        } else if (character === '"') {
          quoted = false;
        } else {
          value += character;
        }
      } else if (character === '"' && value.length === 0) {
        quoted = true;
      } else if (character === ',') {
        row.push(value);
        value = '';
      } else if (character === '\n' || character === '\r') {
        if (character === '\r' && input[index + 1] === '\n') index += 1;
        row.push(value);
        if (row.some((cell) => cell.trim())) rows.push(row);
        row = [];
        value = '';
      } else {
        value += character;
      }
    }
    if (quoted) throw new BadRequestException('Tệp CSV có dấu nháy chưa đóng');
    row.push(value);
    if (row.some((cell) => cell.trim())) rows.push(row);
    return rows;
  }

  async findAll(
    page = 1,
    limit = 5,
    search = '',
    categoryId?: number,
    availability?: 'available' | 'unavailable',
    publicationYear?: number,
    shelf?: string,
    floor?: string,
    aisle?: string,
  ) {
    const safePage = Math.max(1, Number(page) || 1);
    const safeLimit = Math.min(100, Math.max(1, Number(limit) || 5));
    const query = this.bookRepository
      .createQueryBuilder('book')
      .leftJoinAndSelect('book.category', 'category')
      .leftJoinAndSelect('book.publisher', 'publisher')
      .leftJoinAndSelect('book.copies', 'copy');

    if (search) {
      query.where(
        '(book.title LIKE :search OR book.author LIKE :search OR book.isbn LIKE :search)',
        { search: `%${search}%` },
      );
    }
    if (categoryId !== undefined) {
      query.andWhere('category.id = :categoryId', { categoryId });
    }
    if (availability === 'available') {
      query.andWhere('book.availableCopies > 0');
    } else if (availability === 'unavailable') {
      query.andWhere('book.availableCopies = 0');
    }
    if (publicationYear !== undefined) {
      query.andWhere('book.publicationYear = :publicationYear', { publicationYear });
    }
    if (shelf) {
      query.andWhere('(copy.shelf = :shelf OR book.shelf = :shelf)', { shelf });
    }
    if (floor) {
      query.andWhere('(copy.floor = :floor OR book.floor = :floor)', { floor });
    }
    if (aisle) {
      query.andWhere('(copy.aisle = :aisle OR book.aisle = :aisle)', { aisle });
    }

    const [data, total] = await query
      .orderBy('book.title', 'ASC')
      .skip((safePage - 1) * safeLimit)
      .take(safeLimit)
      .getManyAndCount();
    const books = data.map((book) => {
      const { copies, ...bookData } = book;
      const locations = [...new Map(
        (copies ?? [])
          .map(({ shelf, floor, aisle }) => ({
            shelf: shelf || null,
            floor: floor || null,
            aisle: aisle || null,
          }))
          .filter((location) => location.shelf || location.floor || location.aisle)
          .map((location): [string, typeof location] => [JSON.stringify(location), location]),
      ).values()].slice(0, 2);
      return { ...bookData, locations };
    });

    return {
      data: books,
      total,
      page: safePage,
      lastPage: Math.ceil(total / safeLimit) || 1,
    };
  }

  async findLocations() {
    const [books, copies] = await Promise.all([
      this.bookRepository.find({ select: { shelf: true, floor: true, aisle: true } }),
      this.copyRepository.find({ select: { shelf: true, floor: true, aisle: true } }),
    ]);
    const values = (field: 'shelf' | 'floor' | 'aisle') =>
      [...new Set([...books, ...copies]
        .map((item) => item[field]?.trim())
        .filter((value): value is string => Boolean(value)))].sort((a, b) =>
        a.localeCompare(b, 'vi', { numeric: true, sensitivity: 'base' }),
      );
    return {
      shelves: values('shelf'),
      floors: values('floor'),
      aisles: values('aisle'),
    };
  }

  async findOne(id: number) {
    const book = await this.bookRepository.findOne({
      where: { id },
      relations: { category: true, publisher: true },
    });
    if (!book) throw new NotFoundException('Không tìm thấy sách');
    return book;
  }

  async findCopies(id: number) {
    const book = await this.findOne(id);
    await this.ensureCopies(book);
    return this.copyRepository.find({
      where: { book: { id } },
      order: { id: 'ASC' },
    });
  }

  async getCopyLabels(id: number) {
    const copies = await this.findCopies(id);
    return Promise.all(
      copies.map(async (copy) => {
        const barcode = await bwipjs.toBuffer({
          bcid: 'code128',
          text: copy.barcode,
          scale: 2,
          height: 12,
          includetext: true,
        });
        return {
          id: copy.id,
          barcode: copy.barcode,
          image: `data:image/png;base64,${barcode.toString('base64')}`,
        };
      }),
    );
  }

  async findByBarcode(barcode: string) {
    const copy = await this.copyRepository.findOne({
      where: { barcode },
      relations: { book: true },
    });
    if (!copy || !copy.book) throw new NotFoundException('Không tìm thấy mã bản sao');
    return copy;
  }

  async addCopy(bookId: number) {
    const existingBook = await this.findOne(bookId);
    await this.ensureCopies(existingBook);

    return this.dataSource.transaction(async (manager) => {
      const book = await manager.findOne(Book, {
        where: { id: bookId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!book) throw new NotFoundException('Không tìm thấy sách');

      const copy = this.createCopy(book, BookCopyStatus.AVAILABLE);
      await manager.save(copy);
      book.totalCopies += 1;
      const assigned = await this.reservationsService.assignNextWaitingReservation(
        manager,
        book,
        copy,
      );
      if (!assigned) book.availableCopies += 1;
      await manager.save(book);
      return copy;
    });
  }

  async updateCopy(bookId: number, copyId: number, dto: UpdateBookCopyDto) {
    return this.dataSource.transaction(async (manager) => {
      const book = await manager.findOne(Book, {
        where: { id: bookId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!book) throw new NotFoundException('Không tìm thấy sách');
      const copy = await manager.findOne(BookCopy, {
        where: { id: copyId, book: { id: bookId } },
        lock: { mode: 'pessimistic_write' },
      });
      if (!copy) throw new NotFoundException('Không tìm thấy bản sao của đầu sách này');

      const previousStatus = copy.status;
      const nextStatus = dto.status ?? previousStatus;
      if (previousStatus !== nextStatus) {
        if (previousStatus === BookCopyStatus.DISPOSED) {
          throw new BadRequestException('Bản sao đã thanh lý không thể được khôi phục');
        }
        if ([BookCopyStatus.RESERVED, BookCopyStatus.BORROWED].includes(previousStatus)) {
          throw new BadRequestException('Trạng thái bản sao đang được quản lý bởi phiếu mượn');
        }
        if ([BookCopyStatus.RESERVED, BookCopyStatus.BORROWED].includes(nextStatus)) {
          throw new BadRequestException('Chỉ quy trình mượn/trả mới được gán trạng thái này');
        }

        copy.status = nextStatus;
        if (previousStatus === BookCopyStatus.AVAILABLE) {
          book.availableCopies = Math.max(0, book.availableCopies - 1);
        } else if (nextStatus === BookCopyStatus.AVAILABLE) {
          const assigned = await this.reservationsService.assignNextWaitingReservation(
            manager,
            book,
            copy,
          );
          if (!assigned) book.availableCopies += 1;
        }
      }

      if (dto.shelf !== undefined) copy.shelf = dto.shelf || null;
      if (dto.floor !== undefined) copy.floor = dto.floor || null;
      if (dto.aisle !== undefined) copy.aisle = dto.aisle || null;
      await manager.save(copy);
      if (previousStatus !== nextStatus) await manager.save(book);
      return copy;
    });
  }

  async update(id: number, dto: UpdateBookDto) {
    const book = await this.findOne(id);
    await this.ensureCopies(book);

    const category =
      dto.categoryId === undefined
        ? book.category
        : await this.categoryRepository.findOneBy({ id: dto.categoryId });
    if (dto.categoryId !== undefined && !category) {
      throw new NotFoundException('Không tìm thấy thể loại');
    }
    const publisher =
      dto.publisherId === undefined
        ? book.publisher
        : dto.publisherId === null
          ? null
          : await this.publisherRepository.findOneBy({ id: dto.publisherId });
    if (dto.publisherId !== undefined && dto.publisherId !== null && !publisher) {
      throw new NotFoundException('Không tìm thấy nhà xuất bản');
    }

    const copies = await this.copyRepository.find({ where: { book: { id } } });
    const unavailableCount = copies.filter((copy) => copy.status !== BookCopyStatus.AVAILABLE).length;
    const totalCopies = dto.totalCopies ?? book.totalCopies;
    const availableCopies = dto.availableCopies ?? totalCopies - unavailableCount;
    this.validateCopyCounts(totalCopies, availableCopies);
    if (totalCopies - availableCopies < unavailableCount) {
      throw new BadRequestException('Không thể xóa bản sao đang được mượn, giữ chỗ hoặc không khả dụng');
    }

    const availableCopiesNow = copies.filter((copy) => copy.status === BookCopyStatus.AVAILABLE);
    const copiesToRemove = availableCopiesNow.slice(0, Math.max(0, availableCopiesNow.length - availableCopies));
    if (copiesToRemove.length) await this.copyRepository.remove(copiesToRemove);

    const remainingCount = copies.length - copiesToRemove.length;
    const copiesToAdd = totalCopies - remainingCount;
    if (copiesToAdd > 0) {
      const newCopies = Array.from({ length: copiesToAdd }, (_, index) =>
        this.createCopy(
          book,
          index < availableCopies - availableCopiesNow.length + copiesToRemove.length
            ? BookCopyStatus.AVAILABLE
            : BookCopyStatus.DAMAGED,
        ),
      );
      await this.copyRepository.save(newCopies);
    }

    const {
      categoryId: _categoryId,
      publisherId: _publisherId,
      ...bookData
    } = dto;
    Object.assign(book, bookData, { category, publisher, totalCopies, availableCopies });
    return this.bookRepository.save(book);
  }

  async remove(id: number) {
    const book = await this.findOne(id);
    const activeRecord = await this.borrowRepository.findOne({
      where: {
        book: { id },
        status: In([BorrowStatus.PENDING, BorrowStatus.BORROWED]),
      },
    });
    if (activeRecord) throw new BadRequestException('Không thể ẩn sách đang được giữ chỗ hoặc đang mượn');
    await this.bookRepository.softRemove(book);
    return { message: 'Đã ẩn sách khỏi danh mục' };
  }

  private validateCopyCounts(totalCopies: number, availableCopies: number) {
    if (totalCopies < 1 || availableCopies < 0 || availableCopies > totalCopies) {
      throw new BadRequestException('Số bản sao khả dụng phải nằm trong khoảng 0 đến tổng số bản sao');
    }
  }

  private async ensureCopies(book: Book) {
    const existingCount = await this.copyRepository.count({ where: { book: { id: book.id } } });
    if (existingCount > 0) return;

    const availableCopies = Math.min(book.availableCopies, book.totalCopies);
    const copies = Array.from({ length: book.totalCopies }, (_, index) =>
      this.createCopy(
        book,
        index < availableCopies ? BookCopyStatus.AVAILABLE : BookCopyStatus.BORROWED,
      ),
    );
    await this.copyRepository.save(copies);
  }

  private createCopy(book: Book, status: BookCopyStatus) {
    return this.copyRepository.create({
      book,
      status,
      barcode: `COPY-${randomUUID()}`,
    });
  }
}
