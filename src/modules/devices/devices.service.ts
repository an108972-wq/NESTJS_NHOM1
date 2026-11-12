import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Device, DeviceStatus, DeviceCategory } from './entities/device.entity';
import { DeviceLoan, DeviceLoanStatus, DeviceLoanType } from './entities/device-loan.entity';
import { DeviceMaintenance } from './entities/device-maintenance.entity';
import { User } from '../users/entities/user.entity';
import { CreateDeviceDto } from './dto/create-device.dto';
import {
  CreateDeviceLoanDto,
  ReturnDeviceLoanDto,
  CreateMaintenanceDto,
} from './dto/device-actions.dto';

@Injectable()
export class DevicesService {
  constructor(
    @InjectRepository(Device)
    private readonly deviceRepo: Repository<Device>,
    @InjectRepository(DeviceLoan)
    private readonly loanRepo: Repository<DeviceLoan>,
    @InjectRepository(DeviceMaintenance)
    private readonly maintenanceRepo: Repository<DeviceMaintenance>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  async findAll(status?: DeviceStatus, category?: DeviceCategory, search?: string) {
    const qb = this.deviceRepo.createQueryBuilder('d')
      .leftJoinAndSelect('d.loans', 'l', 'l.status = :activeStatus', { activeStatus: DeviceLoanStatus.ACTIVE })
      .leftJoinAndSelect('l.user', 'u');

    if (status) {
      qb.andWhere('d.status = :status', { status });
    }
    if (category) {
      qb.andWhere('d.category = :category', { category });
    }
    if (search) {
      qb.andWhere(
        '(d.code LIKE :s OR d.name LIKE :s OR d.serialNumber LIKE :s OR d.location LIKE :s)',
        { s: `%${search}%` },
      );
    }
    qb.orderBy('d.id', 'DESC');
    return qb.getMany();
  }

  async findOne(id: number) {
    const device = await this.deviceRepo.findOne({
      where: { id },
      relations: { loans: { user: true }, maintenances: true },
    });
    if (!device) throw new NotFoundException(`Thiết bị #${id} không tồn tại`);
    return device;
  }

  async create(dto: CreateDeviceDto) {
    const existing = await this.deviceRepo.findOne({ where: { code: dto.code } });
    if (existing) throw new BadRequestException(`Mã thiết bị ${dto.code} đã tồn tại`);
    const device = this.deviceRepo.create(dto);
    return this.deviceRepo.save(device);
  }

  async update(id: number, dto: Partial<CreateDeviceDto>) {
    const device = await this.findOne(id);
    Object.assign(device, dto);
    return this.deviceRepo.save(device);
  }

  async remove(id: number) {
    const device = await this.findOne(id);
    if (device.status === DeviceStatus.BORROWED) {
      throw new BadRequestException('Không thể xóa thiết bị đang trong trạng thái được mượn');
    }
    await this.deviceRepo.remove(device);
    return { success: true, message: `Đã xóa thiết bị #${id}` };
  }

  // --- MƯỢN TRẢ THIẾT BỊ ---
  async createLoan(dto: CreateDeviceLoanDto) {
    const device = await this.deviceRepo.findOne({ where: { id: dto.deviceId } });
    if (!device) throw new NotFoundException('Thiết bị không tồn tại');
    if (device.status !== DeviceStatus.AVAILABLE) {
      throw new BadRequestException(`Thiết bị hiện không khả dụng (Trạng thái: ${device.status})`);
    }

    const user = await this.userRepo.findOne({ where: { id: dto.userId } });
    if (!user) throw new NotFoundException('Người dùng không tồn tại');

    const duration = dto.durationHours && dto.durationHours > 0 ? dto.durationHours : 2;
    const now = new Date();
    const expectedReturnAt = new Date(now.getTime() + duration * 60 * 60 * 1000);

    const loan = this.loanRepo.create({
      device,
      user,
      loanType: dto.loanType || DeviceLoanType.HOURLY,
      borrowedAt: now,
      expectedReturnAt,
      preCondition: dto.preCondition || 'Tình trạng tốt, hoạt động bình thường, đầy đủ phụ kiện',
      accessoriesChecked: dto.accessoriesChecked !== undefined ? dto.accessoriesChecked : true,
      status: DeviceLoanStatus.ACTIVE,
      notes: dto.notes,
    });

    await this.loanRepo.save(loan);

    device.status = DeviceStatus.BORROWED;
    await this.deviceRepo.save(device);

    return loan;
  }

  async returnLoan(loanId: number, dto: ReturnDeviceLoanDto) {
    const loan = await this.loanRepo.findOne({
      where: { id: loanId },
      relations: { device: true, user: true },
    });
    if (!loan) throw new NotFoundException(`Phiếu mượn #${loanId} không tồn tại`);
    if (loan.status === DeviceLoanStatus.RETURNED) {
      throw new BadRequestException('Phiếu mượn này đã được trả trước đó');
    }

    const returnTime = new Date();
    loan.returnedAt = returnTime;
    loan.postCondition = dto.postCondition || 'Đã kiểm tra, thiết bị hoạt động bình thường';
    loan.accessoriesChecked = dto.accessoriesChecked !== undefined ? dto.accessoriesChecked : true;
    if (dto.notes) loan.notes = `${loan.notes || ''} | Khi trả: ${dto.notes}`;

    // Tự động tính phí phạt trễ hạn
    let fine = 0;
    const expected = new Date(loan.expectedReturnAt);
    if (returnTime > expected) {
      const diffMs = returnTime.getTime() - expected.getTime();
      const overdueHours = Math.ceil(diffMs / (1000 * 60 * 60));
      const rate = Number(loan.device.hourlyFineRate) || 10000; // Mặc định 10k/giờ trễ
      fine = overdueHours * rate;
      loan.status = DeviceLoanStatus.OVERDUE;
    } else {
      loan.status = DeviceLoanStatus.RETURNED;
    }

    if (dto.additionalFine && dto.additionalFine > 0) {
      fine += Number(dto.additionalFine);
    }
    loan.fineAmount = fine;

    await this.loanRepo.save(loan);

    // Cập nhật lại trạng thái thiết bị
    const device = loan.device;
    if (dto.postCondition && (dto.postCondition.toLowerCase().includes('hỏng') || dto.postCondition.toLowerCase().includes('vỡ') || !dto.accessoriesChecked)) {
      device.status = DeviceStatus.DAMAGED;
    } else {
      device.status = DeviceStatus.AVAILABLE;
    }
    await this.deviceRepo.save(device);

    return {
      success: true,
      loan,
      message: fine > 0 ? `Trả thiết bị thành công. Phí phạt quá hạn/hỏng hóc: ${fine.toLocaleString('vi-VN')} đ` : 'Trả thiết bị thành công, không phát sinh tiền phạt.',
    };
  }

  async findLoans(status?: DeviceLoanStatus, deviceId?: number, userId?: number) {
    const qb = this.loanRepo.createQueryBuilder('l')
      .leftJoinAndSelect('l.device', 'd')
      .leftJoinAndSelect('l.user', 'u');

    if (status) qb.andWhere('l.status = :status', { status });
    if (deviceId) qb.andWhere('d.id = :deviceId', { deviceId });
    if (userId) qb.andWhere('u.id = :userId', { userId });

    qb.orderBy('l.id', 'DESC');
    return qb.getMany();
  }

  // --- BẢO DƯỠNG THIẾT BỊ ---
  async createMaintenance(dto: CreateMaintenanceDto) {
    const device = await this.deviceRepo.findOne({ where: { id: dto.deviceId } });
    if (!device) throw new NotFoundException('Thiết bị không tồn tại');

    const maintenance = this.maintenanceRepo.create({
      device,
      title: dto.title,
      maintenanceType: dto.maintenanceType || 'PERIODIC',
      cost: dto.cost || 0,
      scheduledDate: new Date(dto.scheduledDate),
      technician: dto.technician || 'Kỹ thuật viên Thư viện',
      notes: dto.notes,
    });

    const saved = await this.maintenanceRepo.save(maintenance);
    device.status = DeviceStatus.MAINTENANCE;
    await this.deviceRepo.save(device);

    return saved;
  }

  async completeMaintenance(maintenanceId: number, notes?: string) {
    const maint = await this.maintenanceRepo.findOne({
      where: { id: maintenanceId },
      relations: { device: true },
    });
    if (!maint) throw new NotFoundException('Lịch bảo dưỡng không tồn tại');

    maint.completedDate = new Date();
    if (notes) maint.notes = `${maint.notes || ''} | Hoàn tất: ${notes}`;
    await this.maintenanceRepo.save(maint);

    maint.device.status = DeviceStatus.AVAILABLE;
    await this.deviceRepo.save(maint.device);

    return maint;
  }

  async findMaintenances(deviceId?: number) {
    const qb = this.maintenanceRepo.createQueryBuilder('m')
      .leftJoinAndSelect('m.device', 'd');
    if (deviceId) qb.andWhere('d.id = :deviceId', { deviceId });
    qb.orderBy('m.id', 'DESC');
    return qb.getMany();
  }

  // --- THỐNG KÊ TẦN SUẤT SỬ DỤNG & BIÊN BẢN ---
  async getStats() {
    const totalDevices = await this.deviceRepo.count();
    const available = await this.deviceRepo.count({ where: { status: DeviceStatus.AVAILABLE } });
    const borrowed = await this.deviceRepo.count({ where: { status: DeviceStatus.BORROWED } });
    const maintenance = await this.deviceRepo.count({ where: { status: DeviceStatus.MAINTENANCE } });
    const damaged = await this.deviceRepo.count({ where: { status: DeviceStatus.DAMAGED } });

    const totalLoans = await this.loanRepo.count();
    const overdueLoans = await this.loanRepo.count({ where: { status: DeviceLoanStatus.OVERDUE } });

    // Top thiết bị mượn nhiều nhất
    const topDevices = await this.loanRepo.createQueryBuilder('l')
      .select('l.deviceId', 'deviceId')
      .addSelect('COUNT(l.id)', 'loanCount')
      .groupBy('l.deviceId')
      .orderBy('loanCount', 'DESC')
      .limit(5)
      .getRawMany();

    return {
      totalDevices,
      statusCounts: { available, borrowed, maintenance, damaged },
      totalLoans,
      overdueLoans,
      topDevices,
    };
  }

  async getHandoverData(loanId: number) {
    const loan = await this.loanRepo.findOne({
      where: { id: loanId },
      relations: { device: true, user: true },
    });
    if (!loan) throw new NotFoundException('Không tìm thấy phiếu mượn');

    return {
      receiptNumber: `HANDOVER-DEV-${loan.id.toString().padStart(5, '0')}`,
      loanDate: loan.borrowedAt,
      expectedReturnDate: loan.expectedReturnAt,
      actualReturnDate: loan.returnedAt,
      device: {
        code: loan.device.code,
        name: loan.device.name,
        category: loan.device.category,
        serialNumber: loan.device.serialNumber,
        accessories: loan.device.accessories,
      },
      borrower: {
        id: loan.user.id,
        fullName: loan.user.fullName,
        email: loan.user.email,
        phone: loan.user.phone,
      },
      preCondition: loan.preCondition,
      postCondition: loan.postCondition,
      fineAmount: loan.fineAmount,
      status: loan.status,
    };
  }
}
