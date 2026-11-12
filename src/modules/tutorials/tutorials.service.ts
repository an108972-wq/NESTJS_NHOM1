import { BadRequestException, Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LibraryTutorial, TutorialCategory, TutorialFormat, TutorialStatus } from './entities/tutorial.entity';
import { RegistrationStatus, TutorialRegistration } from './entities/tutorial-registration.entity';
import { CreateTutorialDto, RegisterTutorialDto, UpdateTutorialDto } from './dto/tutorial.dto';
import { User } from '../users/entities/user.entity';

@Injectable()
export class TutorialsService implements OnModuleInit {
  constructor(
    @InjectRepository(LibraryTutorial)
    private readonly tutorialRepo: Repository<LibraryTutorial>,
    @InjectRepository(TutorialRegistration)
    private readonly regRepo: Repository<TutorialRegistration>,
  ) {}

  async onModuleInit() {
    await this.seedInitialTutorials();
  }

  private async seedInitialTutorials() {
    try {
      const count = await this.tutorialRepo.count();
      if (count > 0) return;

      const now = new Date();
      const inFiveDays = new Date(now.getTime() + 5 * 86400000);
      const inTenDays = new Date(now.getTime() + 10 * 86400000);

      const defaults: Partial<LibraryTutorial>[] = [
        {
          title: 'Video Hướng dẫn: Khai thác Cổng tra cứu OPAC & Tìm kiếm Nâng cao',
          category: TutorialCategory.SEARCH_GUIDE,
          format: TutorialFormat.VIDEO,
          description: 'Khám phá cách tra cứu sách theo tiêu đề, tác giả, chỉ số phân loại DDC, và sử dụng các toán tử AND, OR, NOT để tìm chính xác tài liệu bạn cần trong 30 giây.',
          contentUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
          thumbnailUrl: 'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?auto=format&fit=crop&w=600&q=80',
          instructor: 'ThS. Nguyễn Văn Toàn',
          durationMinutes: 12,
          viewCount: 320,
          isFeatured: true,
          status: TutorialStatus.ACTIVE,
        },
        {
          title: 'Cẩm nang & Quy định Mượn trả Sách in, Thiết bị và Tủ khóa',
          category: TutorialCategory.POLICY_RULES,
          format: TutorialFormat.PDF,
          description: 'Tài liệu hướng dẫn tổng hợp các quy định về hạn mức mượn sách, cách gia hạn online, biểu phí bồi thường hư hại và quy chế sử dụng phòng học nhóm.',
          contentUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
          thumbnailUrl: 'https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?auto=format&fit=crop&w=600&q=80',
          instructor: 'Ban Quản trị Thư viện',
          durationMinutes: 8,
          viewCount: 450,
          isFeatured: true,
          status: TutorialStatus.ACTIVE,
        },
        {
          title: 'Workshop: Kỹ năng Thông tin (Information Literacy) cho Sinh viên Khóa mới',
          category: TutorialCategory.WORKSHOP,
          format: TutorialFormat.WORKSHOP,
          description: 'Buổi tập huấn thực hành trực tiếp: Đánh giá độ tin cậy của nguồn tin học thuật, tránh đạo văn (Plagiarism) và sử dụng phần mềm quản lý trích dẫn Zotero/Mendeley.',
          contentUrl: 'https://thuvien.edu.vn/workshops/info-lit-2026',
          thumbnailUrl: 'https://images.unsplash.com/photo-1524178232363-1fb2b075b655?auto=format&fit=crop&w=600&q=80',
          instructor: 'TS. Phan Thanh Tùng & Nhóm Hướng dẫn',
          durationMinutes: 90,
          eventDate: inFiveDays,
          maxSeats: 60,
          registeredCount: 38,
          viewCount: 195,
          isFeatured: true,
          status: TutorialStatus.UPCOMING,
        },
        {
          title: 'Hướng dẫn Truy cập Cơ sở Dữ liệu Điện tử từ xa qua VPN Thư viện',
          category: TutorialCategory.DIGITAL_RESOURCES,
          format: TutorialFormat.ARTICLE,
          description: 'Từng bước cài đặt cấu hình VPN Proxy của Nhà trường để truy cập miễn phí toàn văn hàng triệu bài báo khoa học trên Springer, IEEE và ScienceDirect từ nhà.',
          contentUrl: 'https://thuvien.edu.vn/guides/vpn-remote-access',
          thumbnailUrl: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=600&q=80',
          instructor: 'Phòng Công nghệ Thông tin',
          durationMinutes: 10,
          viewCount: 280,
          isFeatured: false,
          status: TutorialStatus.ACTIVE,
        },
      ];

      for (const d of defaults) {
        await this.tutorialRepo.save(this.tutorialRepo.create(d));
      }
    } catch {
      // Non-fatal seed error
    }
  }

  async findAll(category?: string, format?: string, status?: string, search?: string) {
    const qb = this.tutorialRepo.createQueryBuilder('t');

    if (category) {
      qb.andWhere('t.category = :category', { category });
    }
    if (format) {
      qb.andWhere('t.format = :format', { format });
    }
    if (status) {
      qb.andWhere('t.status = :status', { status });
    }
    if (search && search.trim()) {
      const term = `%${search.trim().toLowerCase()}%`;
      qb.andWhere('(LOWER(t.title) LIKE :term OR LOWER(t.description) LIKE :term OR LOWER(t.instructor) LIKE :term)', {
        term,
      });
    }

    qb.orderBy('t.isFeatured', 'DESC').addOrderBy('t.createdAt', 'DESC');
    return qb.getMany();
  }

  async findOne(id: number) {
    const tut = await this.tutorialRepo.findOneBy({ id });
    if (!tut) throw new NotFoundException('Không tìm thấy tài liệu hướng dẫn / workshop');
    tut.viewCount = (tut.viewCount || 0) + 1;
    await this.tutorialRepo.save(tut);
    return tut;
  }

  async create(dto: CreateTutorialDto) {
    const tut = this.tutorialRepo.create({
      ...dto,
      eventDate: dto.eventDate ? new Date(dto.eventDate) : null,
      maxSeats: dto.maxSeats || 50,
      isFeatured: Boolean(dto.isFeatured),
    });
    return this.tutorialRepo.save(tut);
  }

  async update(id: number, dto: UpdateTutorialDto) {
    const tut = await this.findOne(id);
    if (dto.title !== undefined) tut.title = dto.title;
    if (dto.category !== undefined) tut.category = dto.category;
    if (dto.format !== undefined) tut.format = dto.format;
    if (dto.description !== undefined) tut.description = dto.description;
    if (dto.contentUrl !== undefined) tut.contentUrl = dto.contentUrl;
    if (dto.thumbnailUrl !== undefined) tut.thumbnailUrl = dto.thumbnailUrl;
    if (dto.instructor !== undefined) tut.instructor = dto.instructor;
    if (dto.durationMinutes !== undefined) tut.durationMinutes = dto.durationMinutes;
    if (dto.eventDate !== undefined) tut.eventDate = dto.eventDate ? new Date(dto.eventDate) : null;
    if (dto.maxSeats !== undefined) tut.maxSeats = dto.maxSeats;
    if (dto.isFeatured !== undefined) tut.isFeatured = Boolean(dto.isFeatured);
    if (dto.status !== undefined) tut.status = dto.status;
    return this.tutorialRepo.save(tut);
  }

  async remove(id: number) {
    const tut = await this.findOne(id);
    await this.tutorialRepo.remove(tut);
    return { success: true, message: 'Đã xóa tài liệu hướng dẫn thành công' };
  }

  async register(tutorialId: number, dto: RegisterTutorialDto, user?: User) {
    const tut = await this.findOne(tutorialId);
    if (tut.maxSeats && tut.registeredCount >= tut.maxSeats) {
      throw new BadRequestException('Buổi workshop này đã đủ số lượng chỗ đăng ký.');
    }

    const reg = this.regRepo.create({
      tutorial: tut,
      user: user || null,
      fullName: dto.fullName,
      email: dto.email,
      phone: dto.phone,
      cardNumber: dto.cardNumber,
      status: RegistrationStatus.REGISTERED,
    });
    await this.regRepo.save(reg);

    tut.registeredCount = (tut.registeredCount || 0) + 1;
    await this.tutorialRepo.save(tut);

    return {
      success: true,
      message: `Đăng ký tham gia workshop "${tut.title}" thành công!`,
      registration: reg,
    };
  }

  async getRegistrations(tutorialId: number) {
    return this.regRepo.find({
      where: { tutorial: { id: tutorialId } },
      order: { createdAt: 'DESC' },
    });
  }

  async getStats() {
    const totalTutorials = await this.tutorialRepo.count();
    const totalWorkshops = await this.tutorialRepo.countBy({ category: TutorialCategory.WORKSHOP });
    const viewsRaw = await this.tutorialRepo.createQueryBuilder('t').select('SUM(t.viewCount)', 'sum').getRawOne();
    const regRaw = await this.regRepo.count();

    return {
      totalTutorials,
      totalWorkshops,
      totalViews: Number(viewsRaw?.sum || 0),
      totalRegistrations: regRaw,
    };
  }
}

