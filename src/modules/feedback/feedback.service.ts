import { Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FeedbackCategory, FeedbackStatus, ReaderFeedback } from './entities/feedback.entity';
import { CreateFeedbackDto, RespondFeedbackDto } from './dto/feedback.dto';
import { User } from '../users/entities/user.entity';

@Injectable()
export class FeedbackService implements OnModuleInit {
  constructor(
    @InjectRepository(ReaderFeedback)
    private readonly feedbackRepo: Repository<ReaderFeedback>,
  ) {}

  async onModuleInit() {
    await this.seedInitialFeedback();
  }

  private async seedInitialFeedback() {
    try {
      const count = await this.feedbackRepo.count();
      if (count > 0) return;

      const defaults: Partial<ReaderFeedback>[] = [
        {
          senderName: 'Trần Minh Đức',
          senderEmail: 'duc.tm22@student.edu.vn',
          senderPhone: '0912345678',
          cardNumber: 'TV-00102',
          category: FeedbackCategory.FACILITIES,
          title: 'Đề xuất bổ sung thêm ổ cắm điện tại khu vực tự học Tầng 3',
          content: 'Em thấy khu vực bàn nhóm Tầng 3 rất thoáng mát và yên tĩnh, nhưng các dãy bàn giữa còn thiếu ổ cắm sạc cho laptop. Kính mong Thư viện trang bị thêm ổ cắm dây nối dài để chúng em làm đồ án thuận tiện hơn.',
          rating: 4,
          status: FeedbackStatus.RESOLVED,
          response: 'Cảm ơn phản hồi rất thực tế của bạn. Bộ phận kỹ thuật đã tiến hành lắp đặt thêm 4 hộp ổ cắm đa năng tại các dãy bàn Tầng 3 từ ngày 10/11.',
          respondedByName: 'Thủ thư Trực ban Nguyễn Long',
          respondedAt: new Date(),
        },
        {
          senderName: 'TS. Lê Hoàng Nam',
          senderEmail: 'nam.lh@university.edu.vn',
          senderPhone: '0988776655',
          cardNumber: 'GV-00045',
          category: FeedbackCategory.BOOK_REQUEST,
          title: 'Ý kiến bổ sung tạp chí và tài liệu chuyên sâu về Machine Learning & Big Data',
          content: 'Bộ môn Trí tuệ Nhân tạo đang hướng dẫn các đề tài tốt nghiệp khóa mới. Đề nghị Thư viện liên kết hoặc mua thêm bản quyền điện tử các chuyên san của Springer Nature và O\'Reilly 2025-2026.',
          rating: 5,
          status: FeedbackStatus.IN_PROGRESS,
          response: 'Ban Giám đốc Thư viện đã tiếp nhận ý kiến của Thầy và đưa vào danh mục thẩm định kinh phí bổ sung ngân sách Quý 4.',
          respondedByName: 'Thủ thư Huỳnh Thảo',
          respondedAt: new Date(),
        },
        {
          senderName: 'Phạm Thị Thùy Linh',
          senderEmail: 'linh.ptt@student.edu.vn',
          senderPhone: '0903112233',
          cardNumber: 'TV-00389',
          category: FeedbackCategory.SERVICE_QUALITY,
          title: 'Thái độ phục vụ của các cô thủ thư tại quầy mượn trả rất tận tình',
          content: 'Hôm qua em đến mượn giáo trình ôn tập muộn sát giờ đóng cửa nhưng các cô thủ thư vẫn kiên nhẫn hướng dẫn em quét mã vạch và lấy sách trên kệ. Em xin gửi lời cảm ơn chân thành tới ban quản trị thư viện!',
          rating: 5,
          status: FeedbackStatus.RESOLVED,
          response: 'Thư viện rất vui khi nhận được lời động viên của bạn. Đây là động lực lớn để toàn thể đội ngũ nâng cao hơn nữa chất lượng phục vụ độc giả.',
          respondedByName: 'Thủ thư Trưởng quầy',
          respondedAt: new Date(),
        },
      ];

      for (const d of defaults) {
        await this.feedbackRepo.save(this.feedbackRepo.create(d));
      }
    } catch {
      // Non-fatal seed error
    }
  }

  async findAll(category?: string, status?: string, search?: string) {
    const qb = this.feedbackRepo.createQueryBuilder('f').leftJoinAndSelect('f.user', 'u');

    if (category) {
      qb.andWhere('f.category = :category', { category });
    }
    if (status) {
      qb.andWhere('f.status = :status', { status });
    }
    if (search && search.trim()) {
      const term = `%${search.trim().toLowerCase()}%`;
      qb.andWhere('(LOWER(f.title) LIKE :term OR LOWER(f.content) LIKE :term OR LOWER(f.senderName) LIKE :term OR LOWER(f.cardNumber) LIKE :term)', {
        term,
      });
    }

    qb.orderBy('f.createdAt', 'DESC');
    return qb.getMany();
  }

  async findOne(id: number) {
    const fb = await this.feedbackRepo.findOne({ where: { id }, relations: { user: true } });
    if (!fb) throw new NotFoundException('Không tìm thấy ý kiến đóng góp / phản hồi');
    return fb;
  }

  async create(dto: CreateFeedbackDto, user?: User) {
    const fb = this.feedbackRepo.create({
      ...dto,
      user: user || null,
      rating: Number(dto.rating) || 5,
      status: FeedbackStatus.PENDING,
    });
    return this.feedbackRepo.save(fb);
  }

  async respond(id: number, dto: RespondFeedbackDto, staffName?: string) {
    const fb = await this.findOne(id);
    fb.response = dto.response;
    fb.status = dto.status || FeedbackStatus.RESOLVED;
    fb.respondedByName = staffName || 'Ban Quản trị Thư viện';
    fb.respondedAt = new Date();
    return this.feedbackRepo.save(fb);
  }

  async remove(id: number) {
    const fb = await this.findOne(id);
    await this.feedbackRepo.remove(fb);
    return { success: true, message: 'Đã xóa phản hồi thành công' };
  }

  async getStats() {
    const total = await this.feedbackRepo.count();
    const pending = await this.feedbackRepo.countBy({ status: FeedbackStatus.PENDING });
    const inProgress = await this.feedbackRepo.countBy({ status: FeedbackStatus.IN_PROGRESS });
    const resolved = await this.feedbackRepo.countBy({ status: FeedbackStatus.RESOLVED });

    const avgRaw = await this.feedbackRepo.createQueryBuilder('f').select('AVG(f.rating)', 'avg').getRawOne();
    const avgRating = avgRaw?.avg ? Math.round(Number(avgRaw.avg) * 10) / 10 : 5.0;

    return {
      total,
      pending,
      inProgress,
      resolved,
      avgRating,
    };
  }
}

