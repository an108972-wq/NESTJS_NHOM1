import { Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, Like, Repository } from 'typeorm';
import { EventStatus, EventType, LibraryEvent, TargetAudience } from './entities/library-event.entity';
import { BroadcastEventDto, CreateEventDto, UpdateEventDto } from './dto/event.dto';
import { User } from '../users/entities/user.entity';
import { Notification, NotificationType } from '../notifications/entities/notification.entity';

@Injectable()
export class EventsService implements OnModuleInit {
  constructor(
    @InjectRepository(LibraryEvent)
    private readonly eventRepo: Repository<LibraryEvent>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(Notification)
    private readonly notificationRepo: Repository<Notification>,
  ) {}

  async onModuleInit() {
    await this.seedInitialEvents();
  }

  private async seedInitialEvents() {
    try {
      const count = await this.eventRepo.count();
      if (count > 0) return;

      const now = new Date();
      const inThreeDays = new Date(now.getTime() + 3 * 86400000);
      const inSevenDays = new Date(now.getTime() + 7 * 86400000);

      const defaults: Partial<LibraryEvent>[] = [
        {
          title: 'Triển lãm & Ngày hội Sách mới Năm học 2026',
          type: EventType.EXHIBITION,
          content: 'Chào đón năm học mới, Thư viện tổ chức Tuần lễ Triển lãm Sách mới với hơn 500 đầu sách chuyên khảo, giáo trình đại học chuẩn quốc tế và ấn phẩm khoa học công nghệ vừa cập bến kho sách lưu chiểu.',
          location: 'Sảnh chính Tòa nhà Thư viện Trung tâm (Tầng 1)',
          startDate: now,
          endDate: inSevenDays,
          bannerUrl: 'https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?auto=format&fit=crop&w=800&q=80',
          isPinned: true,
          targetAudience: TargetAudience.ALL,
          status: EventStatus.HAPPENING,
          viewCount: 142,
          createdByName: 'Thủ thư Ban quản lý',
        },
        {
          title: 'Workshop: Kỹ năng Khai thác Cơ sở Dữ liệu & Tài nguyên Số Quốc tế',
          type: EventType.WORKSHOP,
          content: 'Khóa tập huấn chuyên sâu trang bị cho sinh viên năm cuối và nghiên cứu sinh phương pháp tìm kiếm tài liệu trên Scopus, IEEE Xplore, ScienceDirect và cách trích dẫn chuẩn IEEE / APA.',
          location: 'Phòng Hội thảo Đa phương tiện P.302',
          startDate: inThreeDays,
          endDate: inThreeDays,
          bannerUrl: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=800&q=80',
          isPinned: true,
          targetAudience: TargetAudience.STUDENT,
          status: EventStatus.UPCOMING,
          viewCount: 88,
          createdByName: 'Thủ thư Huỳnh Thảo',
        },
        {
          title: 'Thông báo: Tăng cường mở cửa phục vụ 24/7 trong Tuần lễ Thi học kỳ',
          type: EventType.ANNOUNCEMENT,
          content: 'Nhằm tạo điều kiện ôn tập tốt nhất cho toàn thể bạn đọc, từ ngày 15/11 đến hết 30/11, Thư viện mở cửa liên tục các phòng tự học Tầng 2 và Tầng 3 đến 23:00 mỗi ngày, có hỗ trợ nước uống và máy in tài liệu.',
          location: 'Toàn bộ không gian Thư viện',
          startDate: now,
          endDate: inSevenDays,
          bannerUrl: 'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?auto=format&fit=crop&w=800&q=80',
          isPinned: false,
          targetAudience: TargetAudience.ALL,
          status: EventStatus.HAPPENING,
          viewCount: 215,
          createdByName: 'Giám đốc Thư viện',
        },
      ];

      for (const d of defaults) {
        await this.eventRepo.save(this.eventRepo.create(d));
      }
    } catch {
      // Non-fatal seeding error
    }
  }

  async findAll(type?: string, status?: string, targetAudience?: string, search?: string) {
    const qb = this.eventRepo.createQueryBuilder('e');

    if (type) {
      qb.andWhere('e.type = :type', { type });
    }
    if (status) {
      qb.andWhere('e.status = :status', { status });
    }
    if (targetAudience && targetAudience !== 'ALL') {
      qb.andWhere('(e.targetAudience = :aud OR e.targetAudience = :allAud)', {
        aud: targetAudience,
        allAud: TargetAudience.ALL,
      });
    }
    if (search && search.trim()) {
      const term = `%${search.trim().toLowerCase()}%`;
      qb.andWhere('(LOWER(e.title) LIKE :term OR LOWER(e.content) LIKE :term OR LOWER(e.location) LIKE :term)', {
        term,
      });
    }

    qb.orderBy('e.isPinned', 'DESC').addOrderBy('e.createdAt', 'DESC');
    return qb.getMany();
  }

  async findOne(id: number) {
    const event = await this.eventRepo.findOneBy({ id });
    if (!event) throw new NotFoundException('Không tìm thấy sự kiện / thông báo');
    event.viewCount = (event.viewCount || 0) + 1;
    await this.eventRepo.save(event);
    return event;
  }

  async create(dto: CreateEventDto, createdByName?: string) {
    const event = this.eventRepo.create({
      ...dto,
      createdByName: createdByName || 'Thủ thư thư viện',
      startDate: dto.startDate ? new Date(dto.startDate) : new Date(),
      endDate: dto.endDate ? new Date(dto.endDate) : null,
      isPinned: Boolean(dto.isPinned),
    });
    return this.eventRepo.save(event);
  }

  async update(id: number, dto: UpdateEventDto) {
    const event = await this.findOne(id);
    if (dto.title !== undefined) event.title = dto.title;
    if (dto.type !== undefined) event.type = dto.type;
    if (dto.content !== undefined) event.content = dto.content;
    if (dto.location !== undefined) event.location = dto.location;
    if (dto.startDate !== undefined) event.startDate = dto.startDate ? new Date(dto.startDate) : null;
    if (dto.endDate !== undefined) event.endDate = dto.endDate ? new Date(dto.endDate) : null;
    if (dto.bannerUrl !== undefined) event.bannerUrl = dto.bannerUrl;
    if (dto.isPinned !== undefined) event.isPinned = Boolean(dto.isPinned);
    if (dto.targetAudience !== undefined) event.targetAudience = dto.targetAudience;
    if (dto.status !== undefined) event.status = dto.status;
    return this.eventRepo.save(event);
  }

  async remove(id: number) {
    const event = await this.findOne(id);
    await this.eventRepo.remove(event);
    return { success: true, message: 'Đã xóa sự kiện / thông báo thành công' };
  }

  async broadcast(id: number, dto: BroadcastEventDto) {
    const event = await this.findOne(id);
    const audience = dto.targetAudience || event.targetAudience || TargetAudience.ALL;

    let usersQuery = this.userRepo.createQueryBuilder('u').where('u.isActive = :act', { act: true });
    if (audience !== TargetAudience.ALL) {
      usersQuery = usersQuery.andWhere('u.role = :aud OR u.readerGroup = :aud', { aud: audience });
    }
    const recipients = await usersQuery.getMany();

    let sentCount = 0;
    for (const user of recipients) {
      try {
        const notif = this.notificationRepo.create({
          user,
          type: NotificationType.ACQUISITION_UPDATE,
          title: `📢 ${(event.title || 'Thông báo').slice(0, 150)}`,
          message: `${(event.content || '').slice(0, 500)}`,
        });
        await this.notificationRepo.save(notif);
        sentCount++;
      } catch {
        // Skip duplicate or constraint errors
      }
    }

    return {
      success: true,
      sentCount,
      targetAudience: audience,
      message: `Đã phát thông báo thành công tới ${sentCount} độc giả trong hệ thống.`,
    };
  }

  async getStats() {
    const total = await this.eventRepo.count();
    const upcoming = await this.eventRepo.countBy({ status: EventStatus.UPCOMING });
    const happening = await this.eventRepo.countBy({ status: EventStatus.HAPPENING });
    const pinned = await this.eventRepo.countBy({ isPinned: true });
    const viewsRaw = await this.eventRepo.createQueryBuilder('e').select('SUM(e.viewCount)', 'sum').getRawOne();
    return {
      total,
      upcoming,
      happening,
      pinned,
      totalViews: Number(viewsRaw?.sum || 0),
    };
  }
}
