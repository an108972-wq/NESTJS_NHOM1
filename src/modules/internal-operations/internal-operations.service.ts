import { Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  KpiRank,
  LibraryZone,
  ShiftSchedule,
  ShiftStatus,
  ShiftType,
  StaffKpi,
} from './entities/internal-operation.entity';
import {
  CreateKpiDto,
  CreateShiftDto,
  SwapShiftDto,
  UpdateShiftDto,
} from './dto/internal-operation.dto';

@Injectable()
export class InternalOperationsService implements OnModuleInit {
  constructor(
    @InjectRepository(ShiftSchedule)
    private readonly shiftRepo: Repository<ShiftSchedule>,
    @InjectRepository(StaffKpi)
    private readonly kpiRepo: Repository<StaffKpi>,
  ) {}

  async onModuleInit() {
    await this.seedShiftsIfEmpty();
    await this.seedKpiIfEmpty();
  }

  private async seedShiftsIfEmpty() {
    const count = await this.shiftRepo.count();
    if (count > 0) return;

    const today = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    const getDateStr = (offsetDays: number) => {
      const d = new Date(today);
      d.setDate(d.getDate() + offsetDays);
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    };

    const sampleShifts = [
      this.shiftRepo.create({
        shiftDate: getDateStr(0),
        shiftType: ShiftType.MORNING,
        zone: LibraryZone.CIRCULATION_DESK,
        staffId: 1,
        staffName: 'Thủ thư Nguyễn Văn Quản',
        status: ShiftStatus.ASSIGNED,
        note: 'Trực quầy chính & tiếp nhận thẻ tân sinh viên',
      }),
      this.shiftRepo.create({
        shiftDate: getDateStr(0),
        shiftType: ShiftType.AFTERNOON,
        zone: LibraryZone.READING_ROOM,
        staffId: 2,
        staffName: 'Thủ thư Lê Thị Hồng',
        status: ShiftStatus.ASSIGNED,
        note: 'Kiểm soát trật tự phòng tự học tầng 2',
      }),
      this.shiftRepo.create({
        shiftDate: getDateStr(0),
        shiftType: ShiftType.EVENING,
        zone: LibraryZone.STACKS_STORAGE,
        staffId: 3,
        staffName: 'Thủ thư Trần Đình Trọng',
        status: ShiftStatus.ASSIGNED,
        note: 'Sắp xếp sách hoàn trả về kệ chuẩn Dewey',
      }),
      this.shiftRepo.create({
        shiftDate: getDateStr(1),
        shiftType: ShiftType.MORNING,
        zone: LibraryZone.MULTIMEDIA_ROOM,
        staffId: 4,
        staffName: 'Thủ thư Hoàng Thảo My',
        status: ShiftStatus.ASSIGNED,
        note: 'Hỗ trợ sinh viên sử dụng phòng máy tính & E-Library',
      }),
      this.shiftRepo.create({
        shiftDate: getDateStr(1),
        shiftType: ShiftType.AFTERNOON,
        zone: LibraryZone.CIRCULATION_DESK,
        staffId: 1,
        staffName: 'Thủ thư Nguyễn Văn Quản',
        status: ShiftStatus.SWAPPED,
        swapWithStaffName: 'Thủ thư Lê Thị Hồng',
        note: 'Đã đổi ca trực theo thỏa thuận nội bộ',
      }),
      this.shiftRepo.create({
        shiftDate: getDateStr(2),
        shiftType: ShiftType.EVENING,
        zone: LibraryZone.READING_ROOM,
        staffId: 2,
        staffName: 'Thủ thư Lê Thị Hồng',
        status: ShiftStatus.LEAVE_REQUESTED,
        note: 'Báo nghỉ phép bận việc gia đình, nhờ đồng nghiệp trực thay',
      }),
    ];

    await this.shiftRepo.save(sampleShifts);
  }

  private async seedKpiIfEmpty() {
    const count = await this.kpiRepo.count();
    if (count > 0) return;

    const sampleKpis = [
      this.kpiRepo.create({
        staffId: 1,
        staffName: 'Thủ thư Nguyễn Văn Quản',
        roleTitle: 'Thủ thư Quầy Lưu hành',
        monthYear: '2026-11',
        catalogedBooksCount: 145,
        processedLoansCount: 680,
        inventoryAuditsCount: 12,
        satisfactionScore: 4.9,
        totalKpiPoints: 95,
        kpiRank: KpiRank.EXCELLENT,
        note: 'Hiệu suất phục vụ mượn trả vượt 125% chỉ tiêu tháng. Đạt 100% đánh giá 5 sao từ độc giả.',
      }),
      this.kpiRepo.create({
        staffId: 2,
        staffName: 'Thủ thư Lê Thị Hồng',
        roleTitle: 'Thủ thư Biên mục & Xử lý Kỹ thuật',
        monthYear: '2026-11',
        catalogedBooksCount: 320,
        processedLoansCount: 210,
        inventoryAuditsCount: 8,
        satisfactionScore: 4.8,
        totalKpiPoints: 88,
        kpiRank: KpiRank.GOOD,
        note: 'Hoàn thành xuất sắc tiến độ nhập kho 3 đợt sách tài trợ mới và dán nhãn RFID nhanh chóng.',
      }),
      this.kpiRepo.create({
        staffId: 3,
        staffName: 'Thủ thư Trần Đình Trọng',
        roleTitle: 'Thủ thư Quản lý Kho & Bảo quản',
        monthYear: '2026-11',
        catalogedBooksCount: 80,
        processedLoansCount: 390,
        inventoryAuditsCount: 25,
        satisfactionScore: 4.6,
        totalKpiPoints: 82,
        kpiRank: KpiRank.GOOD,
        note: 'Duy trì trật tự giá sách tầng 2-3 và phát hiện xử lý kịp thời 4 đầu sách hư hỏng gáy.',
      }),
      this.kpiRepo.create({
        staffId: 4,
        staffName: 'Thủ thư Hoàng Thảo My',
        roleTitle: 'Thủ thư Thư viện số & Hỗ trợ Bạn đọc',
        monthYear: '2026-11',
        catalogedBooksCount: 65,
        processedLoansCount: 180,
        inventoryAuditsCount: 5,
        satisfactionScore: 4.7,
        totalKpiPoints: 78,
        kpiRank: KpiRank.GOOD,
        note: 'Tổ chức 2 buổi workshop Information Literacy thành công với hơn 200 sinh viên tham gia.',
      }),
    ];

    await this.kpiRepo.save(sampleKpis);
  }

  // --- QUẢN LÝ CA TRỰC (SHIFTS) ---
  async findAllShifts(date?: string, shiftType?: string, zone?: string) {
    const qb = this.shiftRepo.createQueryBuilder('s');

    if (date) {
      qb.andWhere('s.shiftDate = :date', { date });
    }
    if (shiftType) {
      qb.andWhere('s.shiftType = :shiftType', { shiftType });
    }
    if (zone) {
      qb.andWhere('s.zone = :zone', { zone });
    }

    qb.orderBy('s.shiftDate', 'ASC').addOrderBy('s.shiftType', 'ASC');
    return qb.getMany();
  }

  async getShiftsStats() {
    const all = await this.shiftRepo.find();
    const total = all.length;
    const assigned = all.filter((s) => s.status === ShiftStatus.ASSIGNED).length;
    const leaveRequests = all.filter((s) => s.status === ShiftStatus.LEAVE_REQUESTED).length;
    const swapped = all.filter((s) => s.status === ShiftStatus.SWAPPED).length;

    return {
      total,
      assigned,
      leaveRequests,
      swapped,
    };
  }

  async createShift(dto: CreateShiftDto) {
    const shift = this.shiftRepo.create(dto);
    return this.shiftRepo.save(shift);
  }

  async updateShift(id: number, dto: UpdateShiftDto) {
    const shift = await this.shiftRepo.findOne({ where: { id } });
    if (!shift) throw new NotFoundException(`Không tìm thấy ca trực #${id}`);
    Object.assign(shift, dto);
    return this.shiftRepo.save(shift);
  }

  async deleteShift(id: number) {
    const shift = await this.shiftRepo.findOne({ where: { id } });
    if (!shift) throw new NotFoundException(`Không tìm thấy ca trực #${id}`);
    await this.shiftRepo.remove(shift);
    return { success: true, message: `Đã xóa ca trực #${id}` };
  }

  async swapShift(id: number, dto: SwapShiftDto) {
    const shift = await this.shiftRepo.findOne({ where: { id } });
    if (!shift) throw new NotFoundException(`Không tìm thấy ca trực #${id}`);

    shift.status = ShiftStatus.SWAPPED;
    shift.swapWithStaffName = dto.swapWithStaffName;
    if (dto.reason) {
      shift.note = (shift.note ? shift.note + ' | ' : '') + `Lý do đổi ca: ${dto.reason}`;
    }
    return this.shiftRepo.save(shift);
  }

  // --- QUẢN LÝ KPI & HIỆU SUẤT THỦ THƯ ---
  async findAllKpi(monthYear?: string) {
    const qb = this.kpiRepo.createQueryBuilder('k');
    if (monthYear) {
      qb.andWhere('k.monthYear = :monthYear', { monthYear });
    }
    qb.orderBy('k.totalKpiPoints', 'DESC');
    return qb.getMany();
  }

  async getKpiStats(monthYear?: string) {
    const list = await this.findAllKpi(monthYear);
    const totalStaff = list.length;
    const excellentCount = list.filter((k) => k.kpiRank === KpiRank.EXCELLENT).length;
    const goodCount = list.filter((k) => k.kpiRank === KpiRank.GOOD).length;
    const averageScore = totalStaff > 0
      ? (list.reduce((sum, k) => sum + Number(k.satisfactionScore || 0), 0) / totalStaff).toFixed(1)
      : '5.0';

    return {
      totalStaff,
      excellentCount,
      goodCount,
      averageScore,
    };
  }

  async createKpi(dto: CreateKpiDto) {
    // Tính tổng điểm KPI tự động theo thang 100
    // Trọng số: 40% mượn trả, 30% biên mục, 15% kiểm kê, 15% hài lòng
    const points = Math.min(
      100,
      Math.round(
        (Math.min(dto.processedLoansCount, 500) / 500) * 40 +
        (Math.min(dto.catalogedBooksCount, 250) / 250) * 30 +
        (Math.min(dto.inventoryAuditsCount, 20) / 20) * 15 +
        ((dto.satisfactionScore || 4.5) / 5.0) * 15,
      ),
    );

    let kpiRank = KpiRank.GOOD;
    if (points >= 90) kpiRank = KpiRank.EXCELLENT;
    else if (points >= 75) kpiRank = KpiRank.GOOD;
    else if (points >= 60) kpiRank = KpiRank.AVERAGE;
    else kpiRank = KpiRank.NEEDS_IMPROVEMENT;

    const kpi = this.kpiRepo.create({
      ...dto,
      totalKpiPoints: points,
      kpiRank,
    });
    return this.kpiRepo.save(kpi);
  }

  async deleteKpi(id: number) {
    const kpi = await this.kpiRepo.findOne({ where: { id } });
    if (!kpi) throw new NotFoundException(`Không tìm thấy hồ sơ KPI #${id}`);
    await this.kpiRepo.remove(kpi);
    return { success: true, message: `Đã xóa hồ sơ KPI #${id}` };
  }
}

