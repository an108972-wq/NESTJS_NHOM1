import { Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  ExchangeGrant,
  ExchangeGrantType,
  Seminar,
  SeminarStatus,
} from './entities/academic-exchange.entity';
import {
  CreateExchangeGrantDto,
  CreateSeminarDto,
  RegisterSeminarDto,
  UpdateExchangeGrantDto,
  UpdateSeminarDto,
} from './dto/academic-exchange.dto';

@Injectable()
export class AcademicExchangeService implements OnModuleInit {
  constructor(
    @InjectRepository(Seminar)
    private readonly seminarRepo: Repository<Seminar>,
    @InjectRepository(ExchangeGrant)
    private readonly grantRepo: Repository<ExchangeGrant>,
  ) {}

  async onModuleInit() {
    await this.seedSeminarsIfEmpty();
    await this.seedGrantsIfEmpty();
  }

  private async seedSeminarsIfEmpty() {
    const count = await this.seminarRepo.count();
    if (count > 0) return;

    const initialAttendees = [
      { id: 'REG-001', name: 'Nguyễn Văn Đạt', email: 'dat.nv@bk.edu.vn', cardNumber: 'SV2022-101', checkedIn: true, time: '08:15' },
      { id: 'REG-002', name: 'Lê Thu Trang', email: 'trang.lt@bk.edu.vn', cardNumber: 'SV2022-205', checkedIn: true, time: '08:22' },
      { id: 'REG-003', name: 'Trần Hoàng Long', email: 'long.th@bk.edu.vn', cardNumber: 'SV2021-340', checkedIn: false, time: null },
    ];

    const sampleSeminars = [
      this.seminarRepo.create({
        title: 'Tọa đàm Khoa học: Trí tuệ Nhân tạo Tạo sinh & Tương lai của Công bố Học thuật',
        theme: 'Nghiên cứu khoa học & AI',
        speakerNames: 'GS. TS. Ngô Bảo Châu & TS. Lê Viết Quốc (Google DeepMind)',
        location: 'Hội trường Đa năng - Tầng 4 Thư viện Trung tâm',
        eventDate: new Date(Date.now() + 5 * 86400000), // 5 ngày tới
        durationMinutes: 120,
        maxSeats: 150,
        registeredSeats: 142,
        status: SeminarStatus.UPCOMING,
        description: 'Thảo luận sâu về xu hướng tích hợp AI trong nghiên cứu liên ngành, liêm chính học thuật và bảo vệ bản quyền tri thức số.',
        attendanceListJson: JSON.stringify(initialAttendees),
      }),
      this.seminarRepo.create({
        title: 'Giới thiệu Bộ sách Chuyên khảo: Lịch sử Kỹ thuật & Công nghiệp Việt Nam Thế kỷ XX',
        theme: 'Giới thiệu sách mới',
        speakerNames: 'Nhà nghiên cứu Nguyễn Đình Đầu & PGS. Trần Bá Đệ',
        location: 'Phòng Hội thảo Chuyên đề B - Tầng 2',
        eventDate: new Date(Date.now() + 12 * 86400000),
        durationMinutes: 90,
        maxSeats: 80,
        registeredSeats: 58,
        status: SeminarStatus.UPCOMING,
        description: 'Tác giả giao lưu trực tiếp với độc giả, ký tặng sách và trao tặng 50 bản sách đặc biệt cho kho tài liệu thư viện.',
        attendanceListJson: JSON.stringify([]),
      }),
      this.seminarRepo.create({
        title: 'Diễn đàn Sinh viên & Khởi nghiệp: Từ Ý tưởng Đồ án đến Sản phẩm Thương mại hóa',
        theme: 'Tọa đàm khởi nghiệp',
        speakerNames: 'Shark Phạm Thanh Hưng & Cựu SV Founder Startup Unicorn',
        location: 'Sảnh Triển lãm Tầng 1 Thư viện',
        eventDate: new Date(Date.now() - 3 * 86400000), // Đã diễn ra
        durationMinutes: 150,
        maxSeats: 200,
        registeredSeats: 195,
        status: SeminarStatus.ENDED,
        description: 'Chia sẻ kinh nghiệm khai thác bằng sáng chế và CSDL sở hữu trí tuệ trong thư viện để phát triển dự án kinh doanh.',
        attendanceListJson: JSON.stringify(initialAttendees),
      }),
    ];

    await this.seminarRepo.save(sampleSeminars);
  }

  private async seedGrantsIfEmpty() {
    const count = await this.grantRepo.count();
    if (count > 0) return;

    const sampleGrants = [
      this.grantRepo.create({
        programType: ExchangeGrantType.BOOK_EXCHANGE,
        title: 'Chương trình Trao đổi Học liệu & Sách Chuyên khảo Quốc tế NUS - HUST 2026',
        partnerInstitution: 'Đại học Quốc gia Singapore (National University of Singapore - NUS)',
        country: 'Singapore',
        bookQuantity: 450,
        grantAmount: 85000000,
        beneficiariesCount: 600,
        status: 'ACTIVE',
        note: 'Trao đổi song phương 450 đầu sách khoa học công nghệ tiếng Anh và giáo trình số giữa hai thư viện.',
        startDate: new Date(Date.now() - 30 * 86400000),
        endDate: new Date(Date.now() + 180 * 86400000),
      }),
      this.grantRepo.create({
        programType: ExchangeGrantType.BOOK_EXCHANGE,
        title: 'Dự án Hợp tác Trao đổi Tài liệu Lưu chiểu Khối Thư viện Đại học Kỹ thuật Châu Á (AOTULE)',
        partnerInstitution: 'Viện Công nghệ Tokyo (Tokyo Tech, Nhật Bản)',
        country: 'Nhật Bản',
        bookQuantity: 300,
        grantAmount: 60000000,
        beneficiariesCount: 400,
        status: 'ACTIVE',
        note: 'Tiếp nhận các tạp chí khoa học quốc tế Scopus Q1 và tài liệu hội thảo chuyên ngành Cơ khí - Tự động hóa.',
        startDate: new Date(Date.now() - 60 * 86400000),
        endDate: new Date(Date.now() + 120 * 86400000),
      }),
      this.grantRepo.create({
        programType: ExchangeGrantType.READING_GRANT,
        title: 'Quỹ Học bổng "Thắp Sáng Tri Thức" - Tài trợ Học liệu & Thiết bị Đọc cho Sinh viên Vượt khó',
        partnerInstitution: 'Tập đoàn Viễn thông Quân đội Viettel & Quỹ Khuyến học',
        country: 'Việt Nam',
        bookQuantity: 120,
        grantAmount: 150000000,
        beneficiariesCount: 50,
        status: 'ACTIVE',
        note: 'Trao tặng 50 suất học bổng tài liệu trị giá 3.000.000đ/suất cùng máy đọc sách Kindle Paperwhite cho sinh viên nghèo hiếu học.',
        startDate: new Date(Date.now() - 15 * 86400000),
        endDate: new Date(Date.now() + 90 * 86400000),
      }),
    ];

    await this.grantRepo.save(sampleGrants);
  }

  // --- HỘI THẢO & DIỄN ĐÀN (SEMINARS) ---
  async findAllSeminars(status?: string, search?: string) {
    const qb = this.seminarRepo.createQueryBuilder('s');

    if (status) {
      qb.andWhere('s.status = :status', { status });
    }
    if (search) {
      qb.andWhere(
        '(LOWER(s.title) LIKE LOWER(:search) OR LOWER(s.speakerNames) LIKE LOWER(:search) OR LOWER(s.theme) LIKE LOWER(:search))',
        { search: `%${search}%` },
      );
    }

    qb.orderBy('s.eventDate', 'ASC');
    return qb.getMany();
  }

  async getSeminarsStats() {
    const all = await this.seminarRepo.find();
    const total = all.length;
    const upcoming = all.filter((s) => s.status === SeminarStatus.UPCOMING).length;
    const happening = all.filter((s) => s.status === SeminarStatus.HAPPENING).length;
    const ended = all.filter((s) => s.status === SeminarStatus.ENDED).length;
    const totalRegistered = all.reduce((sum, s) => sum + (s.registeredSeats || 0), 0);

    return {
      total,
      upcoming,
      happening,
      ended,
      totalRegistered,
    };
  }

  async findSeminarById(id: number) {
    const sem = await this.seminarRepo.findOne({ where: { id } });
    if (!sem) throw new NotFoundException(`Không tìm thấy hội thảo #${id}`);
    return sem;
  }

  async createSeminar(dto: CreateSeminarDto) {
    const sem = this.seminarRepo.create({
      ...dto,
      eventDate: new Date(dto.eventDate),
      attendanceListJson: '[]',
      registeredSeats: 0,
    });
    return this.seminarRepo.save(sem);
  }

  async updateSeminar(id: number, dto: UpdateSeminarDto) {
    const sem = await this.findSeminarById(id);
    if (dto.eventDate) (dto as any).eventDate = new Date(dto.eventDate);
    Object.assign(sem, dto);
    return this.seminarRepo.save(sem);
  }

  async deleteSeminar(id: number) {
    const sem = await this.findSeminarById(id);
    await this.seminarRepo.remove(sem);
    return { success: true, message: `Đã xóa hội thảo #${id}` };
  }

  async registerSeminar(id: number, dto: RegisterSeminarDto) {
    const sem = await this.findSeminarById(id);
    if (sem.registeredSeats >= sem.maxSeats) {
      throw new Error('Buổi hội thảo đã hết chỗ đăng ký!');
    }

    let attendees = [];
    try {
      attendees = JSON.parse(sem.attendanceListJson || '[]');
    } catch (_) {}

    const newReg = {
      id: `REG-${Math.floor(100 + Math.random() * 900)}`,
      name: dto.fullName,
      email: dto.email,
      cardNumber: dto.cardNumber || 'SV2025-000',
      checkedIn: false,
      registeredAt: new Date().toISOString(),
    };

    attendees.push(newReg);
    sem.attendanceListJson = JSON.stringify(attendees);
    sem.registeredSeats = (sem.registeredSeats || 0) + 1;
    return this.seminarRepo.save(sem);
  }

  async checkInAttendee(seminarId: number, attendeeId: string) {
    const sem = await this.findSeminarById(seminarId);
    let attendees = [];
    try {
      attendees = JSON.parse(sem.attendanceListJson || '[]');
    } catch (_) {}

    const att = attendees.find((a: any) => a.id === attendeeId);
    if (att) {
      att.checkedIn = true;
      att.time = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    }

    sem.attendanceListJson = JSON.stringify(attendees);
    return this.seminarRepo.save(sem);
  }

  // --- SÁCH TRAO ĐỔI & HỌC BỔNG (EXCHANGE GRANTS) ---
  async findAllGrants(programType?: string, status?: string, search?: string) {
    const qb = this.grantRepo.createQueryBuilder('g');

    if (programType) {
      qb.andWhere('g.programType = :programType', { programType });
    }
    if (status) {
      qb.andWhere('g.status = :status', { status });
    }
    if (search) {
      qb.andWhere(
        '(LOWER(g.title) LIKE LOWER(:search) OR LOWER(g.partnerInstitution) LIKE LOWER(:search) OR LOWER(g.country) LIKE LOWER(:search))',
        { search: `%${search}%` },
      );
    }

    qb.orderBy('g.startDate', 'DESC');
    return qb.getMany();
  }

  async getGrantsStats() {
    const all = await this.grantRepo.find();
    const total = all.length;
    const totalExchangedBooks = all.reduce((sum, g) => sum + (g.bookQuantity || 0), 0);
    const totalGrantAmount = all.reduce((sum, g) => sum + Number(g.grantAmount || 0), 0);
    const totalBeneficiaries = all.reduce((sum, g) => sum + (g.beneficiariesCount || 0), 0);

    return {
      total,
      totalExchangedBooks,
      totalGrantAmount,
      totalBeneficiaries,
    };
  }

  async createGrant(dto: CreateExchangeGrantDto) {
    const grant = this.grantRepo.create(dto);
    return this.grantRepo.save(grant);
  }

  async updateGrant(id: number, dto: UpdateExchangeGrantDto) {
    const grant = await this.grantRepo.findOne({ where: { id } });
    if (!grant) throw new NotFoundException(`Không tìm thấy chương trình #${id}`);
    Object.assign(grant, dto);
    return this.grantRepo.save(grant);
  }

  async deleteGrant(id: number) {
    const grant = await this.grantRepo.findOne({ where: { id } });
    if (!grant) throw new NotFoundException(`Không tìm thấy chương trình #${id}`);
    await this.grantRepo.remove(grant);
    return { success: true, message: `Đã xóa chương trình #${id}` };
  }
}

