import { Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  MultimediaCondition,
  MultimediaItem,
  MultimediaType,
  Thesis,
  ThesisSecurityStatus,
} from './entities/academic-resource.entity';
import {
  CreateMultimediaDto,
  CreateThesisDto,
  UpdateMultimediaDto,
  UpdateThesisDto,
} from './dto/academic-resource.dto';

@Injectable()
export class AcademicResourcesService implements OnModuleInit {
  constructor(
    @InjectRepository(Thesis)
    private readonly thesisRepo: Repository<Thesis>,
    @InjectRepository(MultimediaItem)
    private readonly multimediaRepo: Repository<MultimediaItem>,
  ) {}

  async onModuleInit() {
    await this.seedThesesIfEmpty();
    await this.seedMultimediaIfEmpty();
  }

  private async seedThesesIfEmpty() {
    const count = await this.thesisRepo.count();
    if (count > 0) return;

    const sampleTheses = [
      this.thesisRepo.create({
        code: 'LV-2025-CNTT-001',
        title: 'Nghiên cứu ứng dụng Mô hình Ngôn ngữ Lớn (LLM) trong hệ thống Phân loại và Tra cứu Thư viện Số',
        authorName: 'Đặng Tuấn Anh',
        studentId: '20210089',
        advisorName: 'PGS. TS. Nguyễn Đức Dũng',
        major: 'Công nghệ Thông tin',
        defenseYear: 2025,
        securityStatus: ThesisSecurityStatus.PUBLIC,
        fileUrl: '/uploads/theses/lv-2025-cntt-001.pdf',
        abstract: 'Đề tài tập trung xây dựng pipeline trích xuất tri thức từ tài liệu học thuật và tích hợp mô hình ngôn ngữ tiếng Việt vào cổng tra cứu OPAC thế hệ mới.',
        viewCount: 385,
      }),
      this.thesisRepo.create({
        code: 'LV-2025-AI-002',
        title: 'Tối ưu hóa Thuật toán Gợi ý Học liệu cá nhân hóa dựa trên Đồ thị Tri thức (Knowledge Graph)',
        authorName: 'Lê Thảo My',
        studentId: '20210452',
        advisorName: 'TS. Hoàng Văn Thư',
        major: 'Trí tuệ Nhân tạo & Khoa học Dữ liệu',
        defenseYear: 2025,
        securityStatus: ThesisSecurityStatus.PUBLIC,
        fileUrl: '/uploads/theses/lv-2025-ai-002.pdf',
        abstract: 'Đề xuất thuật toán hybrid recommendation kết hợp hành vi mượn sách, lịch sử tìm kiếm số và quan hệ liên ngành giữa các giáo trình đại học.',
        viewCount: 290,
      }),
      this.thesisRepo.create({
        code: 'LV-2024-QTKD-015',
        title: 'Chiến lược Chuyển đổi số và Quản trị Trải nghiệm Người dùng trong các Thư viện Đại học tại Việt Nam',
        authorName: 'Phạm Minh Quang',
        studentId: '20205510',
        advisorName: 'TS. Vũ Bích Ngọc',
        major: 'Quản trị Kinh doanh',
        defenseYear: 2024,
        securityStatus: ThesisSecurityStatus.INTERNAL,
        fileUrl: '/uploads/theses/lv-2024-qtkd-015.pdf',
        abstract: 'Khảo sát 1,500 sinh viên tại 5 trường đại học trọng điểm về mức độ sẵn sàng đón nhận dịch vụ thư viện thông minh (Smart Library).',
        viewCount: 172,
      }),
      this.thesisRepo.create({
        code: 'LV-2024-DTVT-008',
        title: 'Thiết kế Mạng Cảm biến IoT LoRaWAN giám sát điều kiện bảo quản Sách Cổ và Tư liệu Hán Nôm',
        authorName: 'Nguyễn Văn Hùng',
        studentId: '20203342',
        advisorName: 'PGS. TS. Trần Cao Quyền',
        major: 'Điện tử - Viễn thông',
        defenseYear: 2024,
        securityStatus: ThesisSecurityStatus.RESTRICTED,
        fileUrl: '/uploads/theses/lv-2024-dtvt-008.pdf',
        abstract: 'Xây dựng phần cứng cảm biến năng lượng thấp, truyền thông xuyên tường hầm kho lưu trữ để kiểm soát độ ẩm và vi nấm gây hại tài liệu quý.',
        viewCount: 94,
      }),
    ];

    await this.thesisRepo.save(sampleTheses);
  }

  private async seedMultimediaIfEmpty() {
    const count = await this.multimediaRepo.count();
    if (count > 0) return;

    const sampleItems = [
      this.multimediaRepo.create({
        code: 'MM-CD-2024-001',
        title: 'Đĩa DVD: Lễ Kỷ Niệm 70 Năm Thành Lập Trường và Lịch Sử Phát Triển Thư Viện',
        type: MultimediaType.CD_DVD,
        location: 'Kệ Tư liệu Lịch sử A1 - Ngăn 3',
        condition: MultimediaCondition.GOOD,
        quantity: 5,
        onSiteLoanCount: 42,
        description: 'Tư liệu video độ phân giải cao 4K ghi lại các dấu mốc quan trọng và phỏng vấn các thế hệ Hiệu trưởng qua các thời kỳ.',
        digitalFileUrl: 'https://archive.org/details/bk-history-70yrs',
      }),
      this.multimediaRepo.create({
        code: 'MM-MAP-1975-004',
        title: 'Bản Đồ Địa Chính & Quy Hoạch Khuôn Viên Học Xá Đại Học Bách Khoa (Bản vẽ tay 1975)',
        type: MultimediaType.MAP,
        location: 'Tủ Bản đồ & Bản vẽ Quy hoạch B3',
        condition: MultimediaCondition.NEED_DIGITIZATION,
        quantity: 2,
        onSiteLoanCount: 18,
        description: 'Bản đồ khổ lớn giấy can, mực in nguyên bản. Cần ưu tiên chụp số hóa độ phân giải cao để bảo tồn tài liệu gốc.',
      }),
      this.multimediaRepo.create({
        code: 'MM-CAS-1988-002',
        title: 'Băng Cassette: Bài Giảng Đại Số Tuyến Tính của Cố GS. Lê Văn Thiêm',
        type: MultimediaType.CASSETTE,
        location: 'Hộp Chống ẩm Tư liệu Âm thanh C1',
        condition: MultimediaCondition.NEED_DIGITIZATION,
        quantity: 1,
        onSiteLoanCount: 12,
        description: 'Băng từ analog ghi âm trực tiếp tại giảng đường năm 1988. Đã lên kế hoạch chuyển đổi sang định dạng số FLAC.',
      }),
      this.multimediaRepo.create({
        code: 'MM-PHOTO-1960-010',
        title: 'Bộ Ảnh Tư Liệu Trắng Đen: Đoàn Chuyên Gia Liên Xô Hỗ Trợ Xây Dựng Thư Viện (1960-1965)',
        type: MultimediaType.HISTORIC_PHOTO,
        location: 'Album Tư liệu Đặc biệt - Phòng Truyền thống',
        condition: MultimediaCondition.GOOD,
        quantity: 24,
        onSiteLoanCount: 65,
        description: 'Tập hợp 24 bức ảnh gốc kèm chú thích chữ Nga - Việt về các kỹ sư và chuyên gia thư viện học Liên Xô.',
        digitalFileUrl: '/uploads/multimedia/soviet-experts-1960.zip',
      }),
    ];

    await this.multimediaRepo.save(sampleItems);
  }

  // --- QUẢN LÝ LUẬN VĂN & KHÓA LUẬN (THESES) ---
  async findAllTheses(major?: string, securityStatus?: string, search?: string) {
    const qb = this.thesisRepo.createQueryBuilder('t');

    if (major) {
      qb.andWhere('t.major = :major', { major });
    }
    if (securityStatus) {
      qb.andWhere('t.securityStatus = :securityStatus', { securityStatus });
    }
    if (search) {
      qb.andWhere(
        '(LOWER(t.title) LIKE LOWER(:search) OR LOWER(t.authorName) LIKE LOWER(:search) OR LOWER(t.advisorName) LIKE LOWER(:search) OR LOWER(t.code) LIKE LOWER(:search))',
        { search: `%${search}%` },
      );
    }

    qb.orderBy('t.defenseYear', 'DESC').addOrderBy('t.createdAt', 'DESC');
    return qb.getMany();
  }

  async getThesesStats() {
    const all = await this.thesisRepo.find();
    const total = all.length;
    const publicCount = all.filter((t) => t.securityStatus === ThesisSecurityStatus.PUBLIC).length;
    const internalCount = all.filter((t) => t.securityStatus === ThesisSecurityStatus.INTERNAL).length;
    const restrictedCount = all.filter((t) => t.securityStatus === ThesisSecurityStatus.RESTRICTED).length;
    const totalViews = all.reduce((sum, t) => sum + (t.viewCount || 0), 0);

    return {
      total,
      publicCount,
      internalCount,
      restrictedCount,
      totalViews,
    };
  }

  async findThesisById(id: number) {
    const thesis = await this.thesisRepo.findOne({ where: { id } });
    if (!thesis) throw new NotFoundException(`Không tìm thấy luận văn #${id}`);
    thesis.viewCount = (thesis.viewCount || 0) + 1;
    await this.thesisRepo.save(thesis);
    return thesis;
  }

  async createThesis(dto: CreateThesisDto) {
    const thesis = this.thesisRepo.create(dto);
    return this.thesisRepo.save(thesis);
  }

  async updateThesis(id: number, dto: UpdateThesisDto) {
    const thesis = await this.thesisRepo.findOne({ where: { id } });
    if (!thesis) throw new NotFoundException(`Không tìm thấy luận văn #${id}`);
    Object.assign(thesis, dto);
    return this.thesisRepo.save(thesis);
  }

  async deleteThesis(id: number) {
    const thesis = await this.thesisRepo.findOne({ where: { id } });
    if (!thesis) throw new NotFoundException(`Không tìm thấy luận văn #${id}`);
    await this.thesisRepo.remove(thesis);
    return { success: true, message: `Đã xóa luận văn #${id}` };
  }

  // --- QUẢN LÝ ĐA PHƯƠNG TIỆN & TƯ LIỆU ĐẶC BIỆT ---
  async findAllMultimedia(type?: string, condition?: string, search?: string) {
    const qb = this.multimediaRepo.createQueryBuilder('m');

    if (type) {
      qb.andWhere('m.type = :type', { type });
    }
    if (condition) {
      qb.andWhere('m.condition = :condition', { condition });
    }
    if (search) {
      qb.andWhere(
        '(LOWER(m.title) LIKE LOWER(:search) OR LOWER(m.code) LIKE LOWER(:search) OR LOWER(m.location) LIKE LOWER(:search))',
        { search: `%${search}%` },
      );
    }

    qb.orderBy('m.type', 'ASC').addOrderBy('m.createdAt', 'DESC');
    return qb.getMany();
  }

  async getMultimediaStats() {
    const all = await this.multimediaRepo.find();
    const total = all.length;
    const goodCondition = all.filter((m) => m.condition === MultimediaCondition.GOOD).length;
    const needDigitization = all.filter((m) => m.condition === MultimediaCondition.NEED_DIGITIZATION).length;
    const damaged = all.filter((m) => m.condition === MultimediaCondition.DAMAGED).length;
    const totalOnSiteLoans = all.reduce((sum, m) => sum + (m.onSiteLoanCount || 0), 0);

    return {
      total,
      goodCondition,
      needDigitization,
      damaged,
      totalOnSiteLoans,
    };
  }

  async findMultimediaById(id: number) {
    const item = await this.multimediaRepo.findOne({ where: { id } });
    if (!item) throw new NotFoundException(`Không tìm thấy tư liệu #${id}`);
    return item;
  }

  async createMultimedia(dto: CreateMultimediaDto) {
    const item = this.multimediaRepo.create(dto);
    return this.multimediaRepo.save(item);
  }

  async updateMultimedia(id: number, dto: UpdateMultimediaDto) {
    const item = await this.findMultimediaById(id);
    Object.assign(item, dto);
    return this.multimediaRepo.save(item);
  }

  async deleteMultimedia(id: number) {
    const item = await this.findMultimediaById(id);
    await this.multimediaRepo.remove(item);
    return { success: true, message: `Đã xóa tư liệu #${id}` };
  }

  async recordOnSiteLoan(id: number) {
    const item = await this.findMultimediaById(id);
    item.onSiteLoanCount = (item.onSiteLoanCount || 0) + 1;
    return this.multimediaRepo.save(item);
  }
}

