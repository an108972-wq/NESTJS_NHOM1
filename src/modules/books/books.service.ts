import { FavoriteBook } from './entities/favorite-book.entity';
import { Optional } from '@nestjs/common';
import { randomUUID } from 'crypto';
import {
  BadRequestException,
  ForbiddenException,
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
    @Optional()
    @InjectRepository(FavoriteBook)
    private readonly favoriteRepo?: Repository<FavoriteBook>,
  ) { }

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
      shelf: book.shelf || null,
      floor: book.floor || null,
      aisle: book.aisle || null,
    });
  }

  async runInventoryAudit(dto: {
    floor?: string;
    aisle?: string;
    shelf?: string;
    scannedBarcodes: string[];
  }) {
    const { floor, aisle, shelf, scannedBarcodes = [] } = dto;
    const qb = this.copyRepository
      .createQueryBuilder('copy')
      .leftJoinAndSelect('copy.book', 'book')
      .where('copy.status != :lostStatus', { lostStatus: BookCopyStatus.LOST })
      .andWhere('copy.status != :disposedStatus', { disposedStatus: BookCopyStatus.DISPOSED });

    if (floor && floor.trim()) {
      qb.andWhere('(copy.floor = :floor OR (copy.floor IS NULL AND book.floor = :floor))', { floor: floor.trim() });
    }
    if (aisle && aisle.trim()) {
      qb.andWhere('(copy.aisle = :aisle OR (copy.aisle IS NULL AND book.aisle = :aisle))', { aisle: aisle.trim() });
    }
    if (shelf && shelf.trim()) {
      qb.andWhere('(copy.shelf = :shelf OR (copy.shelf IS NULL AND book.shelf = :shelf))', { shelf: shelf.trim() });
    }

    const expectedCopies = await qb.getMany();
    const expectedMap = new Map(expectedCopies.map((c) => [c.barcode, c]));
    const scannedSet = new Set(scannedBarcodes.map((b) => b.trim()).filter(Boolean));

    const matched: any[] = [];
    const misplaced: any[] = [];
    const unknown: any[] = [];

    for (const barcode of scannedSet) {
      if (expectedMap.has(barcode)) {
        const copy = expectedMap.get(barcode)!;
        matched.push({
          barcode: copy.barcode,
          title: copy.book?.title || 'Chưa có tiêu đề',
          author: copy.book?.author || '—',
          shelf: copy.shelf || copy.book?.shelf || '—',
          floor: copy.floor || copy.book?.floor || '—',
          aisle: copy.aisle || copy.book?.aisle || '—',
          status: copy.status,
        });
      } else {
        const copy = await this.copyRepository.findOne({
          where: { barcode },
          relations: { book: true },
        });
        if (copy) {
          misplaced.push({
            barcode: copy.barcode,
            title: copy.book?.title || 'Chưa có tiêu đề',
            author: copy.book?.author || '—',
            currentLocation: {
              shelf: copy.shelf || copy.book?.shelf || 'Chưa gán',
              floor: copy.floor || copy.book?.floor || 'Chưa gán',
              aisle: copy.aisle || copy.book?.aisle || 'Chưa gán',
            },
            status: copy.status,
          });
        } else {
          unknown.push({ barcode });
        }
      }
    }

    const missing: any[] = [];
    for (const [barcode, copy] of expectedMap.entries()) {
      if (!scannedSet.has(barcode)) {
        missing.push({
          barcode: copy.barcode,
          title: copy.book?.title || 'Chưa có tiêu đề',
          author: copy.book?.author || '—',
          shelf: copy.shelf || copy.book?.shelf || '—',
          floor: copy.floor || copy.book?.floor || '—',
          aisle: copy.aisle || copy.book?.aisle || '—',
          status: copy.status,
        });
      }
    }

    // Ghi nhận mốc thời gian kiểm kê thực tế vào database cho các bản sao đã quét
    if (scannedSet.size > 0) {
      const scannedList = Array.from(scannedSet);
      try {
        for (let i = 0; i < scannedList.length; i += 50) {
          const chunk = scannedList.slice(i, i + 50);
          await this.copyRepository
            .createQueryBuilder()
            .update(BookCopy)
            .set({ lastAuditedAt: new Date() })
            .where('barcode IN (:...barcodes)', { barcodes: chunk })
            .execute();
        }
      } catch {
        // Bỏ qua nếu cột lastAuditedAt chưa có hoặc DB đang bận
      }
    }

    return {
      totalExpected: expectedCopies.length,
      totalScanned: scannedSet.size,
      matchedCount: matched.length,
      misplacedCount: misplaced.length,
      missingCount: missing.length,
      unknownCount: unknown.length,
      matched,
      misplaced,
      missing,
      unknown,
    };
  }

  async bulkUpdateAuditCopies(dto: {
    barcodes: string[];
    status: BookCopyStatus;
    reason?: string;
  }) {
    const { barcodes = [], status } = dto;
    if (!barcodes.length) {
      throw new BadRequestException('Danh sách mã vạch không được để trống');
    }
    return this.dataSource.transaction(async (manager) => {
      let updatedCount = 0;
      for (const barcode of barcodes) {
        const copy = (await manager.findOne(BookCopy, {
          where: { barcode },
          relations: { book: true },
        })) || (await this.copyRepository.findOne({
          where: { barcode },
          relations: { book: true },
        }));
        if (!copy) continue;
        if ([BookCopyStatus.BORROWED, BookCopyStatus.RESERVED].includes(copy.status)) {
          continue;
        }
        const previousStatus = copy.status;
        if (previousStatus === status) continue;

        copy.status = status;
        await manager.save(copy);

        if (copy.book) {
          if (previousStatus === BookCopyStatus.AVAILABLE) {
            copy.book.availableCopies = Math.max(0, copy.book.availableCopies - 1);
            await manager.save(copy.book);
          } else if (status === BookCopyStatus.AVAILABLE) {
            copy.book.availableCopies += 1;
            await manager.save(copy.book);
          }
        }
        updatedCount++;
      }
      return {
        message: `Đã cập nhật trạng thái ${updatedCount} bản sao thành ${status}`,
        updatedCount,
      };
    });
  }

  async relocateAuditCopies(dto: {
    barcodes: string[];
    floor?: string;
    aisle?: string;
    shelf?: string;
  }) {
    const { barcodes = [], floor, aisle, shelf } = dto;
    if (!barcodes.length) {
      throw new BadRequestException('Danh sách mã vạch không được để trống');
    }
    let updatedCount = 0;
    for (const barcode of barcodes) {
      const copy = await this.copyRepository.findOne({ where: { barcode } });
      if (!copy) continue;
      if (floor !== undefined) copy.floor = floor ? floor.trim() : null;
      if (aisle !== undefined) copy.aisle = aisle ? aisle.trim() : null;
      if (shelf !== undefined) copy.shelf = shelf ? shelf.trim() : null;
      await this.copyRepository.save(copy);
      updatedCount++;
    }
    return {
      message: `Đã cập nhật vị trí cho ${updatedCount} bản sao thành công`,
      updatedCount,
    };
  }

  async getShelvesSummary() {
    try {
      const booksWithoutCopies = await this.bookRepository
        .createQueryBuilder('b')
        .leftJoin('b.copies', 'c')
        .where('c.id IS NULL')
        .getMany();
      for (const b of booksWithoutCopies) {
        await this.ensureCopies(b);
      }
    } catch (_) { }

    const qb = this.copyRepository
      .createQueryBuilder('copy')
      .leftJoin('copy.book', 'book')
      .select([
        "COALESCE(NULLIF(TRIM(copy.floor), ''), NULLIF(TRIM(book.floor), ''), 'Chưa phân tầng') AS floor",
        "COALESCE(NULLIF(TRIM(copy.aisle), ''), NULLIF(TRIM(book.aisle), ''), 'Chưa phân dãy') AS aisle",
        "COALESCE(NULLIF(TRIM(copy.shelf), ''), NULLIF(TRIM(book.shelf), ''), 'Chưa phân kệ') AS shelf",
        'COUNT(copy.id) AS totalCopies',
        "SUM(CASE WHEN copy.status = 'AVAILABLE' THEN 1 ELSE 0 END) AS availableCopies",
        "SUM(CASE WHEN copy.status = 'BORROWED' THEN 1 ELSE 0 END) AS borrowedCopies",
        "SUM(CASE WHEN copy.status = 'LOST' THEN 1 ELSE 0 END) AS lostCopies",
        'COUNT(DISTINCT book.id) AS distinctBooks',
      ])
      .groupBy("COALESCE(NULLIF(TRIM(copy.floor), ''), NULLIF(TRIM(book.floor), ''), 'Chưa phân tầng'), COALESCE(NULLIF(TRIM(copy.aisle), ''), NULLIF(TRIM(book.aisle), ''), 'Chưa phân dãy'), COALESCE(NULLIF(TRIM(copy.shelf), ''), NULLIF(TRIM(book.shelf), ''), 'Chưa phân kệ')")
      .orderBy('floor', 'ASC')
      .addOrderBy('aisle', 'ASC')
      .addOrderBy('shelf', 'ASC');

    const rows = await qb.getRawMany();
    return rows.map((r, index) => ({
      id: index + 1,
      floor: r.floor,
      aisle: r.aisle,
      shelf: r.shelf,
      totalCopies: Number(r.totalCopies) || 0,
      availableCopies: Number(r.availableCopies) || 0,
      borrowedCopies: Number(r.borrowedCopies) || 0,
      lostCopies: Number(r.lostCopies) || 0,
      distinctBooks: Number(r.distinctBooks) || 0,
    }));
  }

  async getBooksOnShelf(floor?: string, aisle?: string, shelf?: string, bookId?: number) {
    const qb = this.copyRepository
      .createQueryBuilder('copy')
      .leftJoinAndSelect('copy.book', 'book')
      .orderBy('book.title', 'ASC');

    if (bookId) {
      qb.andWhere('book.id = :bookId', { bookId });
    }

    if (floor) {
      if (floor === 'Chưa phân tầng') {
        qb.andWhere("((copy.floor IS NULL OR TRIM(copy.floor) = '') AND (book.floor IS NULL OR TRIM(book.floor) = ''))");
      } else {
        qb.andWhere("COALESCE(NULLIF(TRIM(copy.floor), ''), NULLIF(TRIM(book.floor), '')) = :floor", { floor });
      }
    }

    if (aisle) {
      if (aisle === 'Chưa phân dãy') {
        qb.andWhere("((copy.aisle IS NULL OR TRIM(copy.aisle) = '') AND (book.aisle IS NULL OR TRIM(book.aisle) = ''))");
      } else {
        qb.andWhere("COALESCE(NULLIF(TRIM(copy.aisle), ''), NULLIF(TRIM(book.aisle), '')) = :aisle", { aisle });
      }
    }

    if (shelf) {
      if (shelf === 'Chưa phân kệ') {
        qb.andWhere("((copy.shelf IS NULL OR TRIM(copy.shelf) = '') AND (book.shelf IS NULL OR TRIM(book.shelf) = ''))");
      } else {
        qb.andWhere("COALESCE(NULLIF(TRIM(copy.shelf), ''), NULLIF(TRIM(book.shelf), '')) = :shelf", { shelf });
      }
    }

    const copies = await qb.getMany();
    return copies.map((c) => ({
      id: c.id,
      barcode: c.barcode,
      status: c.status,
      shelf: c.shelf || c.book?.shelf || 'Chưa phân kệ',
      floor: c.floor || c.book?.floor || 'Chưa phân tầng',
      aisle: c.aisle || c.book?.aisle || 'Chưa phân dãy',
      bookId: c.book?.id,
      title: c.book?.title,
      author: c.book?.author,
      isbn: c.book?.isbn,
    }));
  }


  async toggleFavorite(bookId: number, userId: number) {
    const book = await this.bookRepository.findOneBy({ id: bookId });
    if (!book) throw new NotFoundException('Không tìm thấy sách');
    const existing = await this.favoriteRepo?.findOne({
      where: { book: { id: bookId }, user: { id: userId } },
    });
    if (existing) {
      await this.favoriteRepo?.remove(existing);
      return { favorited: false, message: 'Đã xóa khỏi danh sách yêu thích' };
    } else {
      const fav = this.favoriteRepo?.create({
        book,
        user: { id: userId } as any,
      });
      if (fav) await this.favoriteRepo?.save(fav);
      return { favorited: true, message: 'Đã thêm vào danh sách yêu thích' };
    }
  }

  async getMyFavorites(userId: number) {
    const favs = await this.favoriteRepo?.find({
      where: { user: { id: userId } },
      relations: { book: { category: true, publisher: true } },
      order: { createdAt: 'DESC' },
    });
    return (favs || []).map((f) => ({
      favoriteId: f.id,
      createdAt: f.createdAt,
      book: f.book,
    }));
  }


  async getDigitalBooks() {
    return this.bookRepository.createQueryBuilder('book')
      .leftJoinAndSelect('book.category', 'category')
      .leftJoinAndSelect('book.publisher', 'publisher')
      .where('book.pdfUrl IS NOT NULL AND book.pdfUrl != ""')
      .orderBy('book.id', 'DESC')
      .getMany();
  }

  async recordDigitalView(bookId: number) {
    const book = await this.bookRepository.findOne({ where: { id: bookId } });
    if (!book) throw new NotFoundException(`Sách #${bookId} không tồn tại`);
    book.digitalViews = (Number(book.digitalViews) || 0) + 1;
    await this.bookRepository.save(book);
    return {
      success: true,
      bookId: book.id,
      digitalViews: book.digitalViews,
    };
  }

  async recordDigitalDownload(bookId: number, isReader: boolean = false) {
    const book = await this.bookRepository.findOne({ where: { id: bookId } });
    if (!book) throw new NotFoundException(`Sách #${bookId} không tồn tại`);

    if (book.pdfPermission === 'NO_DOWNLOAD') {
      throw new ForbiddenException('Tài liệu số này được bảo vệ bản quyền DRM. Không cho phép tải về!');
    }
    if (book.pdfPermission === 'READER_ONLY' && !isReader) {
      throw new ForbiddenException('Tài liệu số này chỉ dành cho độc giả đã đăng nhập.');
    }

    book.digitalDownloads = (Number(book.digitalDownloads) || 0) + 1;
    await this.bookRepository.save(book);
    return {
      success: true,
      bookId: book.id,
      digitalDownloads: book.digitalDownloads,
    };
  }

  async getRelatedBooks(bookId: number) {
    const book = await this.bookRepository.findOne({
      where: { id: bookId },
      relations: { category: true },
    });
    if (!book) return [];

    const qb = this.bookRepository
      .createQueryBuilder('book')
      .leftJoinAndSelect('book.category', 'category')
      .leftJoinAndSelect('book.publisher', 'publisher')
      .where('book.id != :bookId', { bookId });

    if (book.category?.id) {
      qb.andWhere('(book.category.id = :catId OR book.author = :author)', {
        catId: book.category.id,
        author: book.author,
      });
    } else {
      qb.andWhere('book.author = :author', { author: book.author });
    }

    return qb.take(6).getMany();
  }

}
