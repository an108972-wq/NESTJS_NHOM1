import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import importReadXlsxFile = require('read-excel-file/node');
import { CreateCategoryDto } from './dto/create-category.dto.js';
import { UpdateCategoryDto } from './dto/update-category.dto.js';
import { Category } from './entities/category.entity';
import { Book } from '../books/entities/book.entity';

@Injectable()
export class CategoriesService {
  constructor(
    @InjectRepository(Category) private readonly categoryRepository: Repository<Category>,
    @InjectRepository(Book) private readonly bookRepository: Repository<Book>,
  ) { }

  async create(dto: CreateCategoryDto) {
    const trimmedName = dto.name.trim();
    if (await this.categoryRepository.findOneBy({ name: trimmedName })) {
      throw new BadRequestException('Thể loại đã tồn tại');
    }

    let parentId: number | null = null;
    if (dto.parentId) {
      const parent = await this.categoryRepository.findOneBy({ id: dto.parentId });
      if (!parent) throw new BadRequestException('Thể loại cha không tồn tại');
      parentId = parent.id;
    }

    const category = this.categoryRepository.create({
      name: trimmedName,
      description: dto.description?.trim() || undefined,
      ddcCode: dto.ddcCode?.trim() || undefined,
      parentId,
    });
    return this.categoryRepository.save(category);
  }

  async findAll(search?: string) {
    const categories = await this.categoryRepository
      .createQueryBuilder('category')
      .leftJoinAndSelect('category.parent', 'parent')
      .leftJoinAndSelect('category.books', 'book', 'book.deletedAt IS NULL')
      .leftJoinAndSelect('book.copies', 'copy')
      .orderBy('category.name', 'ASC')
      .getMany();

    let result = categories.map((cat) => {
      const books = cat.books || [];
      const bookCount = books.length;
      const totalCopies = books.reduce((sum, b) => {
        const copyCount = b.copies && b.copies.length ? b.copies.length : (b.totalCopies || 0);
        return sum + copyCount;
      }, 0);

      return {
        id: cat.id,
        name: cat.name,
        description: cat.description,
        ddcCode: cat.ddcCode,
        parentId: cat.parentId,
        parent: cat.parent
          ? {
            id: cat.parent.id,
            name: cat.parent.name,
            ddcCode: cat.parent.ddcCode,
          }
          : null,
        bookCount,
        totalCopies,
      };
    });

    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          (c.ddcCode && c.ddcCode.toLowerCase().includes(q)) ||
          (c.description && c.description.toLowerCase().includes(q)) ||
          (c.parent && c.parent.name.toLowerCase().includes(q)),
      );
    }

    return result;
  }

  async findOne(id: number) {
    const category = await this.categoryRepository.findOne({
      where: { id },
      relations: { parent: true },
    });
    if (!category) throw new NotFoundException('Không tìm thấy thể loại');
    return category;
  }

  async update(id: number, dto: UpdateCategoryDto) {
    const category = await this.findOne(id);

    if (dto.name && dto.name.trim() !== category.name) {
      const trimmedName = dto.name.trim();
      const existing = await this.categoryRepository.findOneBy({ name: trimmedName });
      if (existing && existing.id !== id) {
        throw new BadRequestException('Thể loại đã tồn tại');
      }
      category.name = trimmedName;
    }

    if (dto.description !== undefined) {
      category.description = dto.description ? dto.description.trim() : null;
    }

    if (dto.ddcCode !== undefined) {
      category.ddcCode = dto.ddcCode ? dto.ddcCode.trim() : null;
    }

    if (dto.parentId !== undefined) {
      if (dto.parentId === id) {
        throw new BadRequestException('Thể loại cha không thể là chính nó');
      }
      if (dto.parentId) {
        const parent = await this.categoryRepository.findOneBy({ id: dto.parentId });
        if (!parent) throw new BadRequestException('Thể loại cha không tồn tại');
        category.parentId = parent.id;
      } else {
        category.parentId = null;
      }
    }

    return this.categoryRepository.save(category);
  }

  async remove(id: number) {
    const category = await this.findOne(id);

    // 1. Ràng buộc: Không cho phép xóa nếu đang có sách thuộc thể loại đó
    const bookCount = await this.bookRepository.count({
      where: { category: { id } },
    });
    if (bookCount > 0) {
      throw new BadRequestException(
        `Không thể xóa thể loại đang có ${bookCount} đầu sách. Vui lòng chuyển hoặc xóa sách trước.`,
      );
    }

    // 2. Ràng buộc: Không cho phép xóa nếu đang có thể loại con
    const childrenCount = await this.categoryRepository.count({
      where: { parentId: id },
    });
    if (childrenCount > 0) {
      throw new BadRequestException(
        `Không thể xóa thể loại đang có ${childrenCount} thể loại con. Vui lòng cập nhật hoặc xóa thể loại con trước.`,
      );
    }

    await this.categoryRepository.remove(category);
    return { message: 'Đã xóa thể loại thành công' };
  }

  async importCategories(buffer: Buffer, format: 'csv' | 'xlsx') {
    let rows: unknown[][];
    try {
      if (format === 'xlsx') {
        const workbook = await importReadXlsxFile(buffer);
        rows = ((workbook as any)[0]?.rows ?? workbook ?? []) as unknown[][];
      } else {
        rows = this.parseCsv(buffer.toString('utf8'));
      }
    } catch {
      throw new BadRequestException('Tệp không đúng định dạng hoặc bị lỗi');
    }

    if (!rows.length || rows.length < 2) {
      throw new BadRequestException('Tệp không có dữ liệu hoặc thiếu dòng tiêu đề');
    }

    if (rows.length > 501) {
      throw new BadRequestException('Mỗi lần chỉ có thể nhập tối đa 500 thể loại');
    }

    const headers = rows[0].map((v) => String(v ?? '').trim().toLowerCase());
    const nameIdx = headers.findIndex((h) =>
      ['tên thể loại', 'tên danh mục', 'name', 'category', 'thể loại'].some((k) => h.includes(k)),
    );
    const ddcIdx = headers.findIndex((h) =>
      ['mã ddc', 'mã dewey', 'ddc', 'dewey'].some((k) => h.includes(k)),
    );
    const parentIdx = headers.findIndex((h) =>
      ['thể loại cha', 'danh mục cha', 'parent', 'cha'].some((k) => h.includes(k)),
    );
    const descIdx = headers.findIndex((h) =>
      ['mô tả', 'description', 'ghi chú'].some((k) => h.includes(k)),
    );

    if (nameIdx === -1) {
      throw new BadRequestException('Tệp cần có cột "Tên thể loại" hoặc "Name"');
    }

    let successCount = 0;
    const errors: Array<{ row: number; error: string }> = [];

    // Lấy toàn bộ danh mục hiện có để ánh xạ cha - con nhanh
    const allCategories = await this.categoryRepository.find();
    const categoryMap = new Map<string, Category>();
    for (const c of allCategories) {
      categoryMap.set(c.name.toLowerCase().trim(), c);
    }

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (!row || !row.length) continue;

      const rawName = String(row[nameIdx] ?? '').trim();
      if (!rawName) continue;

      const ddcCode = ddcIdx !== -1 && row[ddcIdx] ? String(row[ddcIdx]).trim() : undefined;
      const desc = descIdx !== -1 && row[descIdx] ? String(row[descIdx]).trim() : undefined;
      const rawParent = parentIdx !== -1 && row[parentIdx] ? String(row[parentIdx]).trim() : undefined;

      try {
        let parentId: number | null = null;
        if (rawParent) {
          const parentMatch = categoryMap.get(rawParent.toLowerCase());
          if (parentMatch) {
            parentId = parentMatch.id;
          }
        }

        let cat = categoryMap.get(rawName.toLowerCase());
        if (cat) {
          // Cập nhật nếu đã có
          if (ddcCode !== undefined) cat.ddcCode = ddcCode;
          if (desc !== undefined) cat.description = desc;
          if (parentId !== null && parentId !== cat.id) cat.parentId = parentId;
          cat = await this.categoryRepository.save(cat);
          categoryMap.set(cat.name.toLowerCase().trim(), cat);
        } else {
          // Tạo mới
          cat = this.categoryRepository.create({
            name: rawName,
            ddcCode,
            description: desc,
            parentId,
          });
          cat = await this.categoryRepository.save(cat);
          categoryMap.set(cat.name.toLowerCase().trim(), cat);
        }
        successCount++;
      } catch (err: any) {
        errors.push({ row: i + 1, error: err.message || 'Lỗi không xác định' });
      }
    }

    return {
      totalRows: rows.length - 1,
      successCount,
      failedCount: errors.length,
      errors: errors.slice(0, 10),
    };
  }

  private parseCsv(text: string): string[][] {
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
      } else if (character === '"') {
        quoted = true;
      } else if (character === ',' || character === ';') {
        row.push(value.trim());
        value = '';
      } else if (character === '\n' || character === '\r') {
        if (character === '\r' && input[index + 1] === '\n') {
          index += 1;
        }
        row.push(value.trim());
        if (row.some((cell) => cell.length > 0)) {
          rows.push(row);
        }
        row = [];
        value = '';
      } else {
        value += character;
      }
    }

    if (value.length > 0 || row.length > 0) {
      row.push(value.trim());
      if (row.some((cell) => cell.length > 0)) {
        rows.push(row);
      }
    }

    return rows;
  }
}
