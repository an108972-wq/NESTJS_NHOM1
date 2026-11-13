import { FavoriteBook } from './entities/favorite-book.entity';
import { Optional, OnApplicationBootstrap } from '@nestjs/common';
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
import { User } from '../users/entities/user.entity';
import { UserRole } from '../../common/constants/user-role';

@Injectable()
export class BooksService implements OnApplicationBootstrap {
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
    @Optional()
    @InjectRepository(User)
    private readonly userRepository?: Repository<User>,
  ) { }

  async onApplicationBootstrap() {
    try {
      await this.cleanAndSeedProfessionalLibraryData();
    } catch (err) {
      console.error('Lỗi khi làm sạch và tối ưu dữ liệu thư viện:', err);
    }
  }

  private async cleanAndSeedProfessionalLibraryData() {
    // 1. Dọn dẹp các đầu sách mẫu sơ sài (d, w, Thiện tâm, rỗng...)
    try {
      const dummyBooks = await this.bookRepository
        .createQueryBuilder('b')
        .where("TRIM(b.title) IN ('d', 'w', 'Thiện tâm', 'phù thủy thần tiên', 'a', 'q', '1') OR LENGTH(TRIM(b.title)) <= 2")
        .getMany();

      if (dummyBooks.length > 0) {
        const dummyIds = dummyBooks.map((b) => b.id);
        await this.borrowRepository
          .createQueryBuilder()
          .delete()
          .where('bookId IN (:...ids)', { ids: dummyIds })
          .execute()
          .catch(() => null);

        await this.copyRepository
          .createQueryBuilder()
          .delete()
          .where('bookId IN (:...ids)', { ids: dummyIds })
          .execute()
          .catch(() => null);

        await this.bookRepository.remove(dummyBooks).catch(() => null);
      }
    } catch (_) {}

    // 2. Thiết lập danh mục Thể loại chuẩn DDC
    const standardCategories = [
      { name: 'Công nghệ thông tin', ddcCode: '004', description: 'Khoa học máy tính, kỹ thuật phần mềm, cấu trúc dữ liệu và thuật toán' },
      { name: 'Trí tuệ nhân tạo & Khoa học dữ liệu', ddcCode: '006', description: 'Machine Learning, Deep Learning, Big Data và AI hiện đại' },
      { name: 'Kinh tế & Quản trị kinh doanh', ddcCode: '330', description: 'Kinh tế học vĩ mô, vi mô, khởi nghiệp đổi mới sáng tạo' },
      { name: 'Khoa học tự nhiên & Vũ trụ', ddcCode: '500', description: 'Vật lý thiên văn, toán học, hóa học và sinh học' },
      { name: 'Kỹ năng sống & Phát triển bản thân', ddcCode: '158', description: 'Tâm lý học ứng dụng, giao tiếp, lãnh đạo và tư duy tích cực' },
      { name: 'Văn học & Nghệ thuật', ddcCode: '800', description: 'Tiểu thuyết kinh điển, văn học Việt Nam và thế giới' },
    ];

    const categoryMap = new Map<string, Category>();
    for (const catDto of standardCategories) {
      let cat = await this.categoryRepository.findOneBy({ name: catDto.name });
      if (!cat) {
        cat = this.categoryRepository.create(catDto);
        cat = await this.categoryRepository.save(cat);
      }
      categoryMap.set(cat.name, cat);
    }

    // 3. Thiết lập Nhà xuất bản uy tín
    const standardPublishers = [
      { name: 'NXB Đại học Quốc gia Hà Nội', email: 'dhqg@vnu.edu.vn', phone: '02437547721', address: '144 Xuân Thủy, Cầu Giấy, Hà Nội' },
      { name: 'NXB Bách Khoa Hà Nội', email: 'nxbbk@hust.edu.vn', phone: '02438684569', address: '1 Đại Cồ Việt, Hai Bà Trưng, Hà Nội' },
      { name: 'NXB Thông tin & Truyền thông', email: 'nxb.tttt@mic.gov.vn', phone: '02435772138', address: '115 Trần Duy Hưng, Cầu Giấy, Hà Nội' },
      { name: 'NXB Trẻ', email: 'hopthu@nxbtre.com.vn', phone: '02839316289', address: '161B Lý Chính Thắng, Quận 3, TP.HCM' },
      { name: 'NXB Nhã Nam', email: 'contact@nhanam.vn', phone: '02435146875', address: '59 Đỗ Quang, Cầu Giấy, Hà Nội' },
      { name: 'NXB Kim Đồng', email: 'cskh_online@nxbkimdong.com.vn', phone: '02439434730', address: '55 Quang Trung, Hoàn Kiếm, Hà Nội' },
    ];

    const publisherMap = new Map<string, Publisher>();
    for (const pubDto of standardPublishers) {
      let pub = await this.publisherRepository.findOneBy({ name: pubDto.name });
      if (!pub) {
        pub = this.publisherRepository.create({ ...pubDto, qualityRating: 5, deliverySpeed: 'ON_TIME' as any });
        pub = await this.publisherRepository.save(pub);
      }
      publisherMap.set(pub.name, pub);
    }

    // 4. Danh mục 12 đầu sách học thuật & văn hóa uy tín
    const standardBooks = [
      {
        title: 'Clean Code: Cẩm Nang Viết Mã Sạch',
        author: 'Robert C. Martin',
        isbn: '978-0132350884',
        categoryName: 'Công nghệ thông tin',
        publisherName: 'NXB Thông tin & Truyền thông',
        publicationYear: 2021,
        price: 185000,
        totalCopies: 10,
        availableCopies: 8,
        shelf: 'A1', floor: '2', aisle: '1',
        description: 'Cuốn cẩm nang kinh điển của Uncle Bob về nghệ thuật viết mã sạch, tối ưu cấu trúc phần mềm, nguyên lý SOLID và kỹ thuật tái cấu trúc mã nguồn (Refactoring).',
        coverImageUrl: 'https://images.unsplash.com/photo-1532012164546-f432f2e3777a?auto=format&fit=crop&w=400&q=80',
      },
      {
        title: 'Design Patterns: Mẫu Thiết Kế Hướng Đối Tượng',
        author: 'Erich Gamma, Richard Helm, Ralph Johnson, John Vlissides (GoF)',
        isbn: '978-0201633610',
        categoryName: 'Công nghệ thông tin',
        publisherName: 'NXB Bách Khoa Hà Nội',
        publicationYear: 2020,
        price: 220000,
        totalCopies: 8,
        availableCopies: 6,
        shelf: 'A2', floor: '2', aisle: '1',
        description: '23 mẫu thiết kế kinh điển giúp kỹ sư phần mềm giải quyết các bài toán kiến trúc hệ thống lặp lại, tối ưu hóa tính linh hoạt và khả năng tái sử dụng.',
        coverImageUrl: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=400&q=80',
      },
      {
        title: 'Introduction to Algorithms (CLRS)',
        author: 'Thomas H. Cormen, Charles E. Leiserson, Ronald L. Rivest, Clifford Stein',
        isbn: '978-0262033848',
        categoryName: 'Khoa học máy tính & Trí tuệ nhân tạo',
        publisherName: 'NXB Đại học Quốc gia Hà Nội',
        publicationYear: 2022,
        price: 350000,
        totalCopies: 12,
        availableCopies: 9,
        shelf: 'B1', floor: '2', aisle: '2',
        description: 'Giáo trình giải thuật chuẩn mực toàn cầu cho sinh viên chuyên ngành Khoa học máy tính, bao quát từ cấu trúc dữ liệu nâng cao, quy hoạch động đến đồ thị.',
        coverImageUrl: 'https://images.unsplash.com/photo-1516979187457-637abb4f9353?auto=format&fit=crop&w=400&q=80',
      },
      {
        title: 'Artificial Intelligence: Cách Tiếp Cận Hiện Đại',
        author: 'Stuart Russell, Peter Norvig',
        isbn: '978-0136042594',
        categoryName: 'Khoa học máy tính & Trí tuệ nhân tạo',
        publisherName: 'NXB Đại học Quốc gia Hà Nội',
        publicationYear: 2023,
        price: 380000,
        totalCopies: 10,
        availableCopies: 7,
        shelf: 'B2', floor: '2', aisle: '2',
        description: 'Tác phẩm gối đầu giường về AI, trình bày từ tác tử thông minh, học tăng cường, thị giác máy tính đến các mô hình học sâu thế hệ mới.',
        coverImageUrl: 'https://images.unsplash.com/photo-1507413245164-6160d8298b31?auto=format&fit=crop&w=400&q=80',
      },
      {
        title: 'Giáo trình Cơ Sở Dữ Liệu & Hệ Quản Trị CSDL',
        author: 'PGS.TS. Trần Đức Khánh, TS. Lê Thị Bích',
        isbn: '978-6046294821',
        categoryName: 'Công nghệ thông tin',
        publisherName: 'NXB Đại học Quốc gia Hà Nội',
        publicationYear: 2022,
        price: 120000,
        totalCopies: 15,
        availableCopies: 12,
        shelf: 'A3', floor: '2', aisle: '1',
        description: 'Giáo trình đại học chính quy về đại số quan hệ, chuẩn hóa dữ liệu dạng 3NF/BCNF, ngôn ngữ SQL nâng cao và an toàn giao dịch ACID.',
        coverImageUrl: 'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?auto=format&fit=crop&w=400&q=80',
      },
      {
        title: 'Lập Trình Hướng Đối Tượng Với Java',
        author: 'GS.TS. Nguyễn Thanh Thủy',
        isbn: '978-6049503487',
        categoryName: 'Công nghệ thông tin',
        publisherName: 'NXB Bách Khoa Hà Nội',
        publicationYear: 2022,
        price: 145000,
        totalCopies: 15,
        availableCopies: 11,
        shelf: 'A4', floor: '2', aisle: '1',
        description: 'Trang bị tư duy lập trình hướng đối tượng, xử lý ngoại lệ, Java Collections Framework, kiến trúc đa luồng và thiết kế phần mềm doanh nghiệp.',
        coverImageUrl: 'https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&w=400&q=80',
      },
      {
        title: 'Lược Sử Thời Gian (A Brief History of Time)',
        author: 'Stephen Hawking',
        isbn: '978-0553380163',
        categoryName: 'Khoa học tự nhiên & Vũ trụ',
        publisherName: 'NXB Trẻ',
        publicationYear: 2021,
        price: 125000,
        totalCopies: 8,
        availableCopies: 6,
        shelf: 'C1', floor: '3', aisle: '1',
        description: 'Khám phá các bí ẩn vĩ đại nhất của vũ trụ: hố đen, lý thuyết dây, thuyết tương đối rộng và nguồn gốc không - thời gian.',
        coverImageUrl: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=400&q=80',
      },
      {
        title: 'Sapiens: Lược Sử Loài Người',
        author: 'Yuval Noah Harari',
        isbn: '978-0062316097',
        categoryName: 'Khoa học tự nhiên & Vũ trụ',
        publisherName: 'NXB Tri Thức',
        publicationYear: 2022,
        price: 215000,
        totalCopies: 10,
        availableCopies: 7,
        shelf: 'C2', floor: '3', aisle: '1',
        description: 'Tác phẩm nổi tiếng phân tích 3 cuộc cách mạng then chốt định hình vận mệnh loài người: Nhận thức, Nông nghiệp và Khoa học.',
        coverImageUrl: 'https://images.unsplash.com/photo-1461360370896-922624d12aa1?auto=format&fit=crop&w=400&q=80',
      },
      {
        title: 'Kinh Tế Học Vi Mô & Vĩ Mô Ứng Dụng',
        author: 'N. Gregory Mankiw',
        isbn: '978-1305585126',
        categoryName: 'Kinh tế & Quản trị kinh doanh',
        publisherName: 'NXB Đại học Quốc gia Hà Nội',
        publicationYear: 2022,
        price: 280000,
        totalCopies: 10,
        availableCopies: 8,
        shelf: 'D1', floor: '1', aisle: '2',
        description: 'Bộ sách chuẩn mực về quy luật cung cầu, cân bằng thị trường, chính sách tài khóa, lạm phát và tăng trưởng kinh tế bền vững.',
        coverImageUrl: 'https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?auto=format&fit=crop&w=400&q=80',
      },
      {
        title: 'Khởi Nghiệp Tinh Gọn (The Lean Startup)',
        author: 'Eric Ries',
        isbn: '978-0307887894',
        categoryName: 'Kinh tế & Quản trị kinh doanh',
        publisherName: 'NXB Trẻ',
        publicationYear: 2021,
        price: 150000,
        totalCopies: 8,
        availableCopies: 6,
        shelf: 'D2', floor: '1', aisle: '2',
        description: 'Phương pháp luận tinh gọn: Vòng lặp Xây dựng - Đo lường - Học hỏi giúp startup kiểm chứng ý tưởng kinh doanh với chi phí tối ưu nhất.',
        coverImageUrl: 'https://images.unsplash.com/photo-1559526324-4b87b5e36e44?auto=format&fit=crop&w=400&q=80',
      },
      {
        title: 'Đắc Nhân Tâm',
        author: 'Dale Carnegie',
        isbn: '978-0671027032',
        categoryName: 'Kỹ năng sống & Phát triển bản thân',
        publisherName: 'NXB Trẻ',
        publicationYear: 2022,
        price: 95000,
        totalCopies: 15,
        availableCopies: 11,
        shelf: 'E1', floor: '1', aisle: '1',
        description: 'Cuốn sách gối đầu giường về nghệ thuật lắng nghe, thấu hiểu, truyền cảm hứng và thiết lập các mối quan hệ xã hội tốt đẹp.',
        coverImageUrl: 'https://images.unsplash.com/photo-1499209974431-9dddcece7f88?auto=format&fit=crop&w=400&q=80',
      },
      {
        title: 'Tôi Thấy Hoa Vàng Trên Cỏ Xanh',
        author: 'Nguyễn Nhật Ánh',
        isbn: '978-6041002241',
        categoryName: 'Văn học & Nghệ thuật',
        publisherName: 'NXB Trẻ',
        publicationYear: 2021,
        price: 110000,
        totalCopies: 12,
        availableCopies: 9,
        shelf: 'F1', floor: '3', aisle: '2',
        description: 'Câu chuyện tuổi thơ xúc động tại một làng quê nghèo miền Trung, chứa đựng tình anh em, tình bạn và những rung động đầu đời trong sáng.',
        coverImageUrl: 'https://images.unsplash.com/photo-1476275466078-4007374efbbe?auto=format&fit=crop&w=400&q=80',
      },
    ];

    const seededBooks: Book[] = [];
    for (const bDto of standardBooks) {
      let book = await this.bookRepository.findOne({ where: { isbn: bDto.isbn } });
      const cat = categoryMap.get(bDto.categoryName);
      const pub = publisherMap.get(bDto.publisherName);

      if (!book) {
        book = this.bookRepository.create({
          title: bDto.title,
          author: bDto.author,
          isbn: bDto.isbn,
          publicationYear: bDto.publicationYear,
          price: bDto.price,
          totalCopies: bDto.totalCopies,
          availableCopies: bDto.availableCopies,
          shelf: bDto.shelf,
          floor: bDto.floor,
          aisle: bDto.aisle,
          description: bDto.description,
          coverImageUrl: bDto.coverImageUrl,
          category: cat,
          publisher: pub,
        });
        book = await this.bookRepository.save(book);
      } else {
        book.title = bDto.title;
        book.author = bDto.author;
        book.category = cat;
        book.publisher = pub;
        book.shelf = bDto.shelf;
        book.floor = bDto.floor;
        book.aisle = bDto.aisle;
        book.description = bDto.description;
        book.coverImageUrl = bDto.coverImageUrl;
        book = await this.bookRepository.save(book);
      }

      // Đảm bảo số bản sao (copies) và barcode tương ứng
      const copiesCount = await this.copyRepository.count({ where: { book: { id: book.id } } });
      if (copiesCount < book.totalCopies) {
        const needed = book.totalCopies - copiesCount;
        for (let i = 1; i <= needed; i++) {
          const idx = copiesCount + i;
          const barcode = `BC-${String(book.id).padStart(3, '0')}-${String(idx).padStart(2, '0')}`;
          const status = idx <= book.availableCopies ? BookCopyStatus.AVAILABLE : BookCopyStatus.BORROWED;
          const copy = this.copyRepository.create({
            barcode,
            status,
            shelf: book.shelf,
            floor: book.floor,
            aisle: book.aisle,
            book,
          });
          await this.copyRepository.save(copy);
        }
      }
      seededBooks.push(book);
    }

    // 5. Đảm bảo có độc giả mẫu để kiểm thử luồng mượn trả & duyệt tài khoản
    if (this.userRepository) {
      // 5.1. Độc giả đang chờ duyệt kích hoạt tài khoản
      const pendingReader = await this.userRepository.findOneBy({ username: 'dang.nguyen.sv2024@donga.edu.vn' });
      if (!pendingReader) {
        const newPending = this.userRepository.create({
          username: 'dang.nguyen.sv2024@donga.edu.vn',
          email: 'dang.nguyen.sv2024@donga.edu.vn',
          fullName: 'Đặng Hoàng Nguyên (IT24B)',
          phone: '0912345678',
          passwordHash: '$2b$10$1Qp4LFp..AmWWCy0QHCncOXGvsYG5XgrDlztOp3/fRhxAfRf2Yvie',
          role: UserRole.READER,
          readerGroup: 'STUDENT',
          maxActiveLoans: 5,
          isActive: false,
          approvedAt: null,
        });
        await this.userRepository.save(newPending);
      }

      // 5.2. Độc giả hoạt động sẵn để mượn sách
      const activeReader = await this.userRepository.findOne({ where: { role: UserRole.READER, isActive: true } });
      if (activeReader && seededBooks.length > 0) {
        const borrowCount = await this.borrowRepository.count();
        if (borrowCount < 4) {
          const now = new Date();
          const targetBook = seededBooks[0];
          const copies = await this.copyRepository.find({ where: { book: { id: targetBook.id } } });
          const firstCopy = copies[0];
          const secondCopy = copies[1] || firstCopy;

          // 1 phiếu PENDING (đang chờ duyệt mượn)
          await this.borrowRepository.save(
            this.borrowRepository.create({
              user: activeReader,
              book: targetBook,
              copy: firstCopy,
              status: BorrowStatus.PENDING,
              borrowedAt: now,
              dueDate: null,
              fineAmount: 0,
              fineStatus: 'NONE',
            }),
          );

          // 1 phiếu BORROWED quá hạn 3 ngày (sinh cảnh báo tự động)
          const overdueDue = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
          await this.borrowRepository.save(
            this.borrowRepository.create({
              user: activeReader,
              book: seededBooks[1] || targetBook,
              copy: secondCopy,
              status: BorrowStatus.BORROWED,
              borrowedAt: new Date(now.getTime() - 17 * 24 * 60 * 60 * 1000),
              dueDate: overdueDue,
              approvedAt: new Date(now.getTime() - 17 * 24 * 60 * 60 * 1000),
              fineAmount: 15000,
              fineStatus: 'UNPAID',
            }),
          );

          // 1 phiếu RETURNED hoàn tất
          await this.borrowRepository.save(
            this.borrowRepository.create({
              user: activeReader,
              book: seededBooks[2] || targetBook,
              copy: secondCopy,
              status: BorrowStatus.RETURNED,
              borrowedAt: new Date(now.getTime() - 25 * 24 * 60 * 60 * 1000),
              dueDate: new Date(now.getTime() - 11 * 24 * 60 * 60 * 1000),
              returnedAt: new Date(now.getTime() - 12 * 24 * 60 * 60 * 1000),
              approvedAt: new Date(now.getTime() - 25 * 24 * 60 * 60 * 1000),
              returnCondition: 'GOOD' as any,
              fineAmount: 0,
              fineStatus: 'PAID',
            }),
          );
        }
      }
    }
  }

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
      const f = floor.trim();
      const fNum = f.replace(/\D/g, '');
      const fAlt = f.startsWith('Tầng') ? fNum : `Tầng ${f}`;
      qb.andWhere(
        "(COALESCE(NULLIF(TRIM(copy.floor), ''), NULLIF(TRIM(book.floor), '')) = :floor OR COALESCE(NULLIF(TRIM(copy.floor), ''), NULLIF(TRIM(book.floor), '')) = :floorAlt)",
        { floor: f, floorAlt: fAlt || f },
      );
    }
    if (aisle && aisle.trim()) {
      const a = aisle.trim();
      const aAlt = a.startsWith('Dãy') ? a.replace(/^Dãy\s*/i, '').trim() : `Dãy ${a}`;
      qb.andWhere(
        "(COALESCE(NULLIF(TRIM(copy.aisle), ''), NULLIF(TRIM(book.aisle), '')) = :aisle OR COALESCE(NULLIF(TRIM(copy.aisle), ''), NULLIF(TRIM(book.aisle), '')) = :aisleAlt)",
        { aisle: a, aisleAlt: aAlt },
      );
    }
    if (shelf && shelf.trim()) {
      const s = shelf.trim();
      const sAlt = s.startsWith('Kệ') ? s.replace(/^Kệ\s*/i, '').trim() : `Kệ ${s}`;
      qb.andWhere(
        "(COALESCE(NULLIF(TRIM(copy.shelf), ''), NULLIF(TRIM(book.shelf), '')) = :shelf OR COALESCE(NULLIF(TRIM(copy.shelf), ''), NULLIF(TRIM(book.shelf), '')) = :shelfAlt)",
        { shelf: s, shelfAlt: sAlt },
      );
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
          await this.copyRepository.update(
            { barcode: In(chunk) },
            { lastAuditedAt: new Date() },
          );
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
          } else if (status === BookCopyStatus.AVAILABLE) {
            copy.book.availableCopies += 1;
          }
          if (typeof (manager as any).count === 'function') {
            try {
              const freshCount = await manager.count(BookCopy, {
                where: { book: { id: copy.book.id }, status: BookCopyStatus.AVAILABLE },
              });
              copy.book.availableCopies = freshCount;
            } catch {
              // Dùng availableCopies đã điều chỉnh
            }
          }
          await manager.save(copy.book);
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
