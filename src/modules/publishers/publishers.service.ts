import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreatePublisherDto } from './dto/create-publisher.dto';
import { UpdatePublisherDto } from './dto/update-publisher.dto';
import { Publisher } from './entities/publisher.entity';
import { Book } from '../books/entities/book.entity';
import readXlsxFile from 'read-excel-file/node';

@Injectable()
export class PublishersService {
  constructor(
    @InjectRepository(Publisher)
    private readonly publisherRepository: Repository<Publisher>,
    @InjectRepository(Book)
    private readonly bookRepository: Repository<Book>,
  ) { }

  async create(dto: CreatePublisherDto) {
    if (await this.publisherRepository.findOneBy({ name: dto.name })) {
      throw new BadRequestException('Nhà xuất bản đã tồn tại');
    }
    return this.publisherRepository.save(this.publisherRepository.create(dto));
  }

  async findAll(search?: string) {
    const qb = this.publisherRepository
      .createQueryBuilder('p')
      .leftJoin('p.books', 'b')
      .select([
        'p.id AS id',
        'p.name AS name',
        'p.email AS email',
        'p.phone AS phone',
        'p.address AS address',
        'p.website AS website',
        'p.contactPerson AS contactPerson',
        'COUNT(DISTINCT b.id) AS bookCount',
      ])
      .groupBy('p.id')
      .orderBy('p.name', 'ASC');

    if (search && search.trim()) {
      const s = `%${search.trim()}%`;
      qb.where(
        'p.name LIKE :s OR p.email LIKE :s OR p.phone LIKE :s OR p.contactPerson LIKE :s',
        { s },
      );
    }

    const rows = await qb.getRawMany();
    return rows.map((r) => ({
      id: Number(r.id),
      name: r.name,
      email: r.email ?? null,
      phone: r.phone ?? null,
      address: r.address ?? null,
      website: r.website ?? null,
      contactPerson: r.contactPerson ?? null,
      bookCount: Number(r.bookCount) || 0,
    }));
  }

  async findOne(id: number) {
    const publisher = await this.publisherRepository.findOneBy({ id });
    if (!publisher) throw new NotFoundException('Không tìm thấy nhà xuất bản');
    return publisher;
  }

  async update(id: number, dto: UpdatePublisherDto) {
    const publisher = await this.findOne(id);
    if (
      dto.name &&
      dto.name !== publisher.name &&
      (await this.publisherRepository.findOneBy({ name: dto.name }))
    ) {
      throw new BadRequestException('Nhà xuất bản đã tồn tại');
    }
    Object.assign(publisher, dto);
    return this.publisherRepository.save(publisher);
  }

  async remove(id: number) {
    const publisher = await this.findOne(id);
    const bookCount = await this.bookRepository.count({
      where: { publisher: { id } },
    });
    if (bookCount > 0) {
      throw new BadRequestException(
        `Không thể xóa: Nhà xuất bản đang có ${bookCount} đầu sách. Vui lòng chuyển sách sang NXB khác trước.`,
      );
    }
    await this.publisherRepository.remove(publisher);
    return { message: 'Đã xóa nhà xuất bản' };
  }

  async importPublishers(buffer: Buffer, format: 'csv' | 'xlsx') {
    let rows: unknown[][];
    if (format === 'xlsx') {
      const workbook = await (readXlsxFile as any)(buffer);
      rows = ((workbook as any)[0]?.rows ?? workbook ?? []) as unknown[][];
    } else {
      rows = this.parseCsv(buffer.toString('utf-8'));
    }

    // Bỏ dòng header
    const dataRows = rows.slice(1);
    const results: { name: string; status: string }[] = [];

    for (const row of dataRows) {
      const [nameRaw, emailRaw, phoneRaw, addressRaw, websiteRaw, contactRaw] =
        row as string[];
      const name = (nameRaw ?? '').toString().trim();
      if (!name) continue;

      const existing = await this.publisherRepository.findOneBy({ name });
      const dto: Partial<Publisher> = {
        name,
        email: emailRaw?.toString().trim() || undefined,
        phone: phoneRaw?.toString().trim() || undefined,
        address: addressRaw?.toString().trim() || undefined,
        website: websiteRaw?.toString().trim() || undefined,
        contactPerson: contactRaw?.toString().trim() || undefined,
      };

      if (existing) {
        Object.assign(existing, dto);
        await this.publisherRepository.save(existing);
        results.push({ name, status: 'updated' });
      } else {
        await this.publisherRepository.save(
          this.publisherRepository.create(dto as Publisher),
        );
        results.push({ name, status: 'created' });
      }
    }

    return {
      message: `Nhập thành công ${results.length} nhà xuất bản`,
      results,
    };
  }

  async exportPublishers() {
    const publishers = await this.findAll();
    const header = [
      'Tên nhà xuất bản',
      'Email',
      'Điện thoại',
      'Địa chỉ',
      'Website',
      'Người liên hệ',
      'Số đầu sách',
    ];
    const rows = publishers.map((p) => [
      p.name,
      p.email ?? '',
      p.phone ?? '',
      p.address ?? '',
      p.website ?? '',
      p.contactPerson ?? '',
      p.bookCount,
    ]);
    return [header, ...rows];
  }

  private parseCsv(text: string): string[][] {
    return text
      .split(/\r?\n/)
      .filter((l) => l.trim())
      .map((line) => {
        const result: string[] = [];
        let cur = '';
        let inQuotes = false;
        for (let i = 0; i < line.length; i++) {
          const ch = line[i];
          if (ch === '"') {
            if (inQuotes && line[i + 1] === '"') {
              cur += '"';
              i++;
            } else {
              inQuotes = !inQuotes;
            }
          } else if (ch === ',' && !inQuotes) {
            result.push(cur);
            cur = '';
          } else {
            cur += ch;
          }
        }
        result.push(cur);
        return result;
      });
  }
}
