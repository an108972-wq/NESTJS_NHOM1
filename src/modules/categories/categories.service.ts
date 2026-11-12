import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Optional } from '@nestjs/common';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { MergeCategoriesDto } from './dto/merge-categories.dto.js';
import { MoveBooksCategoryDto } from './dto/move-books.dto.js';
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
    @Optional() private readonly auditLogsService?: AuditLogsService,
  ) {}

  async create(dto: CreateCategoryDto, performer?: any) {
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
    const saved = await this.categoryRepository.save(category);

    if (this.auditLogsService) {
      await this.auditLogsService.log({
        action: 'CREATE_CATEGORY',
        module: 'CATEGORIES',
        description: `Tạo thể loại mới "${saved.name}"${saved.ddcCode ? ' [DDC: ' + saved.ddcCode + ']' : ''}`,
        performerId: performer?.userId || performer?.id,
        performerName: performer?.username,
        performerRole: performer?.role,
      });
    }

    return saved;
  }

  async findAll(search?: string) {
    const categories = await this.categoryRepository
      .createQueryBuilder('category')
      .leftJoinAndSelect('category.parent', 'parent')
      .leftJoinAndSelect('category.children', 'children')
      .leftJoinAndSelect('category.books', 'book', 'book.deletedAt IS NULL')
      .leftJoinAndSelect('book.copies', 'copy')
      .orderBy('category.name', 'ASC')
      .getMany();

    const flatList = categories.map((cat) => {
      const books = cat.books || [];
      const bookCount = books.length;
      const totalCopies = books.reduce((sum, b) => {
        const copyCount = b.copies && b.copies.length ? b.copies.length : (b.totalCopies || 0);
        return sum + copyCount;
      }, 0);
      const availableCopies = books.reduce((sum, b) => {
        const available = b.copies && b.copies.length
          ? b.copies.filter((c: any) => c.status === 'AVAILABLE').length
          : (b.availableCopies || 0);
        return sum + available;
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
        parentName: cat.parent ? cat.parent.name : null,
        childrenCount: cat.children?.length || 0,
        bookCount,
        totalCopies,
        availableCopies,
      };
    });

    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      return flatList.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          (c.ddcCode && c.ddcCode.toLowerCase().includes(q)) ||
          (c.description && c.description.toLowerCase().includes(q)) ||
          (c.parent && c.parent.name.toLowerCase().includes(q)),
      );
    }

    // Tổ chức danh mục phân cấp theo thứ tự: Gốc -> Các con trực tiếp thụt vào
    const rootCategories = flatList.filter((c) => !c.parentId);
    const childrenMap = new Map<number, typeof flatList>();
    for (const c of flatList) {
      if (c.parentId) {
        const list = childrenMap.get(c.parentId) || [];
        list.push(c);
        childrenMap.set(c.parentId, list);
      }
    }

    const hierarchicalList: Array<typeof flatList[0] & { level: number }> = [];
    const traverse = (item: typeof flatList[0], level: number) => {
      hierarchicalList.push({ ...item, level });
      const children = childrenMap.get(item.id) || [];
      for (const child of children) {
        traverse(child, level + 1);
      }
    };

    for (const root of rootCategories) {
      traverse(root, 0);
    }

    // Bổ sung những danh mục độc lập nếu parentId không tìm thấy
    for (const item of flatList) {
      if (!hierarchicalList.some((h) => h.id === item.id)) {
        hierarchicalList.push({ ...item, level: 0 });
      }
    }

    return hierarchicalList;
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
        // Kiểm tra vòng lặp phân cấp
        let currentAncestorId: number | null = parent.parentId;
        while (currentAncestorId) {
          if (currentAncestorId === id) {
            throw new BadRequestException('Không thể chọn thể loại này làm cha vì sẽ tạo vòng lặp phân cấp');
          }
          const ancestor = await this.categoryRepository.findOneBy({ id: currentAncestorId });
          currentAncestorId = ancestor?.parentId || null;
        }
        category.parentId = parent.id;
      } else {
        category.parentId = null;
      }
    }

    return this.categoryRepository.save(category);
  }

  async mergeCategories(dto: MergeCategoriesDto, performer?: any) {
    const target = await this.categoryRepository.findOne({
      where: { id: dto.targetCategoryId },
    });
    if (!target) throw new NotFoundException('Thể loại đích không tồn tại');

    const sourceIds = dto.sourceCategoryIds.filter((id) => id !== dto.targetCategoryId);
    if (!sourceIds.length) {
      throw new BadRequestException('Vui lòng chọn ít nhất một thể loại nguồn khác với thể loại đích');
    }

    const sources = await this.categoryRepository.find({
      where: { id: In(sourceIds) },
    });
    if (!sources.length) {
      throw new BadRequestException('Không tìm thấy thể loại nguồn cần gộp');
    }

    const sourceNames = sources.map((s) => s.name).join(', ');

    // 1. Chuyển toàn bộ sách sang thể loại đích
    const booksCount = await this.bookRepository.count({
      where: { category: { id: In(sourceIds) } },
    });
    if (booksCount > 0) {
      await this.bookRepository
        .createQueryBuilder()
        .update(Book)
        .set({ category: { id: target.id } })
        .where('categoryId IN (:...ids)', { ids: sourceIds })
        .execute();
    }

    // 2. Chuyển các thể loại con sang thể loại đích
    await this.categoryRepository
      .createQueryBuilder()
      .update(Category)
      .set({ parentId: target.id })
      .where('parentId IN (:...ids)', { ids: sourceIds })
      .execute();

    // 3. Xóa các thể loại nguồn nếu deleteSourceCategories = true (mặc định)
    const shouldDelete = dto.deleteSourceCategories !== false;
    if (shouldDelete) {
      await this.categoryRepository.delete({ id: In(sourceIds) });
    }

    const description = `Gộp ${sources.length} thể loại [${sourceNames}] vào "${target.name}". Đã di chuyển ${booksCount} đầu sách.${shouldDelete ? ' Đã xóa danh mục nguồn cũ.' : ''}`;

    if (this.auditLogsService) {
      await this.auditLogsService.log({
        action: 'MERGE_CATEGORIES',
        module: 'CATEGORIES',
        description,
        performerId: performer?.userId || performer?.id,
        performerName: performer?.username,
        performerRole: performer?.role,
      });
    }

    return {
      success: true,
      message: `Đã gộp thành công ${sources.length} thể loại vào "${target.name}". Đã chuyển ${booksCount} đầu sách.`,
      movedBooksCount: booksCount,
      targetCategory: target,
    };
  }

  async moveBooks(sourceId: number, targetId: number, performer?: any) {
    if (sourceId === targetId) {
      throw new BadRequestException('Thể loại nguồn và đích không thể trùng nhau');
    }
    const [source, target] = await Promise.all([
      this.findOne(sourceId),
      this.findOne(targetId),
    ]);

    const booksCount = await this.bookRepository.count({
      where: { category: { id: sourceId } },
    });
    if (booksCount === 0) {
      return {
        success: true,
        message: `Thể loại "${source.name}" hiện không có đầu sách nào để chuyển.`,
        movedBooksCount: 0,
      };
    }

    await this.bookRepository
      .createQueryBuilder()
      .update(Book)
      .set({ category: { id: target.id } })
      .where('categoryId = :sourceId', { sourceId })
      .execute();

    if (this.auditLogsService) {
      await this.auditLogsService.log({
        action: 'MOVE_BOOKS',
        module: 'CATEGORIES',
        description: `Chuyển toàn bộ ${booksCount} đầu sách từ thể loại "${source.name}" sang "${target.name}"`,
        performerId: performer?.userId || performer?.id,
        performerName: performer?.username,
        performerRole: performer?.role,
      });
    }

    return {
      success: true,
      message: `Đã chuyển toàn bộ ${booksCount} đầu sách từ "${source.name}" sang "${target.name}".`,
      movedBooksCount: booksCount,
    };
  }

  async remove(id: number, performer?: any) {
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
