import {
  BadRequestException,
  Injectable,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreatePublisherDto } from './dto/create-publisher.dto';
import { UpdatePublisherDto } from './dto/update-publisher.dto';
import { Publisher } from './entities/publisher.entity';
import { Book } from '../books/entities/book.entity';
import { PurchaseOrder } from '../acquisitions/entities/purchase-order.entity';
import readXlsxFile from 'read-excel-file/node';

@Injectable()
export class PublishersService {
  constructor(
    @InjectRepository(Publisher)
    private readonly publisherRepository: Repository<Publisher>,
    @InjectRepository(Book)
    private readonly bookRepository: Repository<Book>,
    @Optional()
    @InjectRepository(PurchaseOrder)
    private readonly orderRepository?: Repository<PurchaseOrder>,
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
        'p.taxCode AS taxCode',
        'p.email AS email',
        'p.phone AS phone',
        'p.address AS address',
        'p.website AS website',
        'p.contactPerson AS contactPerson',
        'p.qualityRating AS qualityRating',
        'p.deliverySpeed AS deliverySpeed',
        'p.discountRate AS discountRate',
        'p.reputationNotes AS reputationNotes',
        'p.logoUrl AS logoUrl',
        'COUNT(DISTINCT b.id) AS bookCount',
        'COALESCE(SUM(b.totalCopies), 0) AS totalCopies',
        'COALESCE(SUM(b.availableCopies), 0) AS availableCopies',
      ])
      .groupBy('p.id')
      .orderBy('p.name', 'ASC');

    if (search && search.trim()) {
      const s = `%${search.trim()}%`;
      qb.where(
        'p.name LIKE :s OR p.taxCode LIKE :s OR p.email LIKE :s OR p.phone LIKE :s OR p.contactPerson LIKE :s',
        { s },
      );
    }

    const rows = await qb.getRawMany();

    // Tính toán chi phí ngân sách đã hợp tác theo từng nhà xuất bản
    const ordersBySupplier: Record<string, { totalSpent: number; orderCount: number }> = {};
    if (this.orderRepository) {
      try {
        const poRows = await this.orderRepository
          .createQueryBuilder('po')
          .select('po.supplierName', 'supplierName')
          .addSelect('SUM(po.totalAmount)', 'totalSpent')
          .addSelect('COUNT(po.id)', 'orderCount')
          .where('po.status != :cancelled', { cancelled: 'CANCELLED' })
          .groupBy('po.supplierName')
          .getRawMany();

        for (const r of poRows) {
          if (r.supplierName) {
            ordersBySupplier[r.supplierName.trim().toLowerCase()] = {
              totalSpent: Number(r.totalSpent) || 0,
              orderCount: Number(r.orderCount) || 0,
            };
          }
        }
      } catch (err) {
        // Fallback silently if table not populated
      }
    }

    return rows.map((r) => {
      const suppKey = (r.name || '').trim().toLowerCase();
      const poStat = ordersBySupplier[suppKey] || { totalSpent: 0, orderCount: 0 };
      return {
        id: Number(r.id),
        name: r.name,
        taxCode: r.taxCode ?? null,
        email: r.email ?? null,
        phone: r.phone ?? null,
        address: r.address ?? null,
        website: r.website ?? null,
        contactPerson: r.contactPerson ?? null,
        qualityRating: Number(r.qualityRating) || 5,
        deliverySpeed: r.deliverySpeed ?? 'ON_TIME',
        discountRate: Number(r.discountRate) || 0,
        reputationNotes: r.reputationNotes ?? null,
        logoUrl: r.logoUrl ?? null,
        bookCount: Number(r.bookCount) || 0,
        totalCopies: Number(r.totalCopies) || 0,
        availableCopies: Number(r.availableCopies) || 0,
        totalSpent: poStat.totalSpent,
        orderCount: poStat.orderCount,
      };
    });
  }

  async findOne(id: number) {
    const publisher = await this.publisherRepository.findOneBy({ id });
    if (!publisher) throw new NotFoundException('Không tìm thấy nhà xuất bản');
    return publisher;
  }

  async getBudgetSummary(id: number) {
    const publisher = await this.findOne(id);
    let orders: any[] = [];
    let totalSpent = 0;
    if (this.orderRepository) {
      try {
        orders = await this.orderRepository.find({
          where: { supplierName: publisher.name },
          relations: { items: true },
          order: { createdAt: 'DESC' },
        });
        totalSpent = orders
          .filter((o) => o.status !== 'CANCELLED')
          .reduce((sum, o) => sum + (Number(o.totalAmount) || 0), 0);
      } catch (e) {
        // Fallback
      }
    }
    const bookCount = await this.bookRepository.count({
      where: { publisher: { id } },
    });
    return {
      publisher,
      bookCount,
      totalSpent,
      orderCount: orders.length,
      orders,
    };
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

    if (!rows.length) {
      return { message: 'File không có dữ liệu', results: [] };
    }

    // Xác định chỉ số cột từ dòng tiêu đề (header)
    const headerRow = (rows[0] as string[]).map((h) =>
      String(h ?? '').trim().toLowerCase(),
    );

    const getColIndex = (keywords: string[]) =>
      headerRow.findIndex((col) => keywords.some((k) => col.includes(k)));

    const colName = getColIndex(['tên', 'name']);
    const colTax = getColIndex(['thuế', 'tax']);
    const colContact = getColIndex(['đại diện', 'liên hệ', 'contact']);
    const colPhone = getColIndex(['thoại', 'phone']);
    const colEmail = getColIndex(['email']);
    const colAddress = getColIndex(['địa chỉ', 'address']);
    const colWebsite = getColIndex(['web', 'site']);
    const colDiscount = getColIndex(['chiết khấu', 'discount']);
    const colQuality = getColIndex(['chất lượng', 'sao', 'quality']);
    const colDelivery = getColIndex(['tiến độ', 'giao hàng', 'delivery']);
    const colNotes = getColIndex(['ghi chú', 'uy tín', 'note']);

    const dataRows = rows.slice(1);
    const results: { name: string; status: string }[] = [];

    for (const row of dataRows) {
      const r = row as string[];
      // Nếu có tên từ header hoặc fallback cột đầu
      const name = (colName >= 0 ? r[colName] : r[0])?.toString().trim();
      if (!name) continue;

      const taxCode = colTax >= 0 ? r[colTax]?.toString().trim() : undefined;
      const contactPerson =
        colContact >= 0
          ? r[colContact]?.toString().trim()
          : r[5]?.toString().trim();
      const phone =
        colPhone >= 0 ? r[colPhone]?.toString().trim() : r[2]?.toString().trim();
      const email =
        colEmail >= 0 ? r[colEmail]?.toString().trim() : r[1]?.toString().trim();
      const address =
        colAddress >= 0
          ? r[colAddress]?.toString().trim()
          : r[3]?.toString().trim();
      const website =
        colWebsite >= 0
          ? r[colWebsite]?.toString().trim()
          : r[4]?.toString().trim();

      const discountRate =
        colDiscount >= 0 && r[colDiscount] != null
          ? Number(String(r[colDiscount]).replace('%', '').trim()) || 0
          : undefined;

      const qualityRating =
        colQuality >= 0 && r[colQuality] != null
          ? Math.max(1, Math.min(5, Number(r[colQuality]) || 5))
          : undefined;

      const deliverySpeed =
        colDelivery >= 0 ? r[colDelivery]?.toString().trim() : undefined;

      const reputationNotes =
        colNotes >= 0 ? r[colNotes]?.toString().trim() : undefined;

      const existing = await this.publisherRepository.findOneBy({ name });
      const dto: Partial<Publisher> = {
        name,
        taxCode: taxCode || undefined,
        contactPerson: contactPerson || undefined,
        phone: phone || undefined,
        email: email || undefined,
        address: address || undefined,
        website: website || undefined,
        discountRate: discountRate !== undefined ? discountRate : undefined,
        qualityRating: qualityRating !== undefined ? qualityRating : undefined,
        deliverySpeed: deliverySpeed || undefined,
        reputationNotes: reputationNotes || undefined,
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
      message: `Nhập thành công ${results.length} nhà xuất bản đối tác`,
      results,
    };
  }

  async exportPublishers() {
    const publishers = await this.findAll();
    const header = [
      'Tên nhà xuất bản',
      'Mã số thuế',
      'Người đại diện',
      'Điện thoại',
      'Email',
      'Địa chỉ',
      'Website',
      'Chiết khấu (%)',
      'Chất lượng (1-5 Sao)',
      'Tiến độ giao hàng',
      'Đánh giá uy tín & Ghi chú',
      'Số đầu sách',
      'Tổng bản sao kho',
      'Bản sao khả dụng',
      'Tổng ngân sách đã chi (VNĐ)',
      'Số đơn đặt hàng',
    ];

    const rows = publishers.map((p) => [
      p.name,
      p.taxCode ?? '',
      p.contactPerson ?? '',
      p.phone ?? '',
      p.email ?? '',
      p.address ?? '',
      p.website ?? '',
      p.discountRate ?? 0,
      p.qualityRating ?? 5,
      p.deliverySpeed ?? 'ON_TIME',
      p.reputationNotes ?? '',
      p.bookCount,
      p.totalCopies,
      p.availableCopies,
      p.totalSpent,
      p.orderCount,
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
