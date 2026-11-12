import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Locker, LockerStatus } from './entities/locker.entity';
import {
  LockerAssignment,
  AssignmentStatus,
  AssignmentType,
} from './entities/locker-assignment.entity';
import { User } from '../users/entities/user.entity';
import {
  CreateLockerDto,
  CreateBatchLockersDto,
  AssignLockerDto,
  ReleaseLockerDto,
} from './dto/locker.dto';

@Injectable()
export class LockersService {
  constructor(
    @InjectRepository(Locker)
    private readonly lockerRepo: Repository<Locker>,
    @InjectRepository(LockerAssignment)
    private readonly assignRepo: Repository<LockerAssignment>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) { }

  async findAll(zone?: string, cluster?: string, status?: LockerStatus, search?: string) {
    const qb = this.lockerRepo.createQueryBuilder('l')
      .leftJoinAndSelect('l.currentUser', 'u');

    if (zone) qb.andWhere('l.zone = :zone', { zone });
    if (cluster) qb.andWhere('l.cluster = :cluster', { cluster });
    if (status) qb.andWhere('l.status = :status', { status });
    if (search) {
      qb.andWhere('(l.lockerNumber LIKE :s OR l.zone LIKE :s OR l.cluster LIKE :s OR u.fullName LIKE :s)', {
        s: `%${search}%`,
      });
    }

    qb.orderBy('l.lockerNumber', 'ASC');
    return qb.getMany();
  }

  async findOne(id: number) {
    const locker = await this.lockerRepo.findOne({
      where: { id },
      relations: { currentUser: true, assignments: { user: true } },
    });
    if (!locker) throw new NotFoundException(`Tủ khóa #${id} không tồn tại`);
    return locker;
  }

  async create(dto: CreateLockerDto) {
    const existing = await this.lockerRepo.findOne({ where: { lockerNumber: dto.lockerNumber } });
    if (existing) throw new BadRequestException(`Số tủ ${dto.lockerNumber} đã tồn tại`);
    const locker = this.lockerRepo.create(dto);
    return this.lockerRepo.save(locker);
  }

  async createBatch(dto: CreateBatchLockersDto) {
    const created: Locker[] = [];
    for (let i = dto.fromNumber; i <= dto.toNumber; i++) {
      const numStr = i.toString().padStart(2, '0');
      const lockerNumber = `${dto.prefix}-${numStr}`;
      const existing = await this.lockerRepo.findOne({ where: { lockerNumber } });
      if (!existing) {
        const locker = this.lockerRepo.create({
          lockerNumber,
          zone: dto.zone || 'Khu A - Tầng 1',
          cluster: dto.cluster || 'Dãy A1',
          status: LockerStatus.VACANT,
        });
        created.push(locker);
      }
    }
    await this.lockerRepo.save(created);
    return {
      success: true,
      createdCount: created.length,
      message: `Đã khởi tạo thành công ${created.length} tủ khóa mới!`,
    };
  }

  async update(id: number, dto: Partial<CreateLockerDto>) {
    const locker = await this.findOne(id);
    Object.assign(locker, dto);
    return this.lockerRepo.save(locker);
  }

  async remove(id: number) {
    const locker = await this.findOne(id);
    if (locker.status === LockerStatus.IN_USE) {
      throw new BadRequestException('Không thể xóa tủ đang có người sử dụng');
    }
    await this.lockerRepo.remove(locker);
    return { success: true, message: `Đã xóa tủ khóa #${id}` };
  }

  // --- CẤP PHÁT & GIẢI PHÓNG TỦ KHÓA ---
  async assignLocker(dto: AssignLockerDto) {
    const locker = await this.lockerRepo.findOne({ where: { id: dto.lockerId } });
    if (!locker) throw new NotFoundException('Tủ khóa không tồn tại');
    if (locker.status !== LockerStatus.VACANT) {
      throw new BadRequestException(`Tủ khóa hiện không trống (Trạng thái: ${locker.status})`);
    }

    const user = await this.userRepo.findOne({ where: { id: dto.userId } });
    if (!user) throw new NotFoundException('Người dùng không tồn tại');

    // Sinh mã PIN ngẫu nhiên 4 chữ số nếu không chỉ định
    const pin = dto.customPin || Math.floor(1000 + Math.random() * 9000).toString();

    const now = new Date();
    let expiresAt: Date;
    if (dto.expiresAt) {
      expiresAt = new Date(dto.expiresAt);
    } else if (dto.assignmentType === AssignmentType.LONG_TERM) {
      expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 ngày
    } else {
      // Hạn trong ngày: đến 21:00 tối nay
      expiresAt = new Date(now);
      expiresAt.setHours(21, 0, 0, 0);
      if (now.getTime() > expiresAt.getTime()) {
        expiresAt.setDate(expiresAt.getDate() + 1);
      }
    }

    const assignment = this.assignRepo.create({
      locker,
      user,
      assignmentType: dto.assignmentType || AssignmentType.DAILY,
      assignedAt: now,
      expiresAt,
      pinCode: pin,
      status: AssignmentStatus.ACTIVE,
      notes: dto.notes,
    });
    await this.assignRepo.save(assignment);

    locker.status = LockerStatus.IN_USE;
    locker.currentUser = user;
    locker.currentPin = pin;
    await this.lockerRepo.save(locker);

    return {
      success: true,
      assignment,
      pinCode: pin,
      message: `Đã cấp tủ ${locker.lockerNumber} cho độc giả ${user.fullName}. Mã PIN mở tủ: ${pin}`,
    };
  }

  async releaseLocker(lockerId: number, dto?: ReleaseLockerDto) {
    const locker = await this.lockerRepo.findOne({
      where: { id: lockerId },
      relations: { currentUser: true },
    });
    if (!locker) throw new NotFoundException('Tủ khóa không tồn tại');

    const activeAssign = await this.assignRepo.findOne({
      where: { locker: { id: lockerId }, status: AssignmentStatus.ACTIVE },
      order: { id: 'DESC' },
      relations: { user: true, locker: true },
    });

    const now = new Date();
    let message = `Đã giải phóng tủ ${locker.lockerNumber}. Tủ đã sẵn sàng đón lượt sử dụng mới.`;

    if (activeAssign) {
      activeAssign.returnedAt = now;
      if (dto?.actionType === 'FORCED_OPEN') {
        activeAssign.status = AssignmentStatus.FORCED_OPEN;
        message = `Đã mở tủ cưỡng chế cho tủ ${locker.lockerNumber}.`;
      } else {
        activeAssign.status = now > new Date(activeAssign.expiresAt) ? AssignmentStatus.OVERDUE : AssignmentStatus.RETURNED;
      }

      if (dto?.notes) activeAssign.notes = `${activeAssign.notes || ''} | ${dto.notes}`;
      if (dto?.fineAmount && dto.fineAmount > 0) activeAssign.fineAmount = dto.fineAmount;

      await this.assignRepo.save(activeAssign);
    }

    locker.status = LockerStatus.VACANT;
    locker.currentUser = null as any;
    locker.currentPin = null as any;
    await this.lockerRepo.save(locker);

    return { success: true, message };
  }

  async resetPin(lockerId: number) {
    const locker = await this.lockerRepo.findOne({
      where: { id: lockerId },
      relations: { currentUser: true },
    });
    if (!locker) throw new NotFoundException('Tủ khóa không tồn tại');
    if (locker.status !== LockerStatus.IN_USE) {
      throw new BadRequestException('Chỉ có thể đổi mã PIN cho tủ đang được sử dụng');
    }

    const newPin = Math.floor(1000 + Math.random() * 9000).toString();
    locker.currentPin = newPin;
    await this.lockerRepo.save(locker);

    const activeAssign = await this.assignRepo.findOne({
      where: { locker: { id: lockerId }, status: AssignmentStatus.ACTIVE },
      order: { id: 'DESC' },
    });
    if (activeAssign) {
      activeAssign.pinCode = newPin;
      await this.assignRepo.save(activeAssign);
    }

    return {
      success: true,
      newPin,
      message: `Đã cấp lại mã PIN mới cho tủ ${locker.lockerNumber}: ${newPin}`,
    };
  }

  async getOverdueAlerts() {
    const now = new Date();
    const overdueAssignments = await this.assignRepo.createQueryBuilder('a')
      .leftJoinAndSelect('a.locker', 'l')
      .leftJoinAndSelect('a.user', 'u')
      .where('a.status = :activeStatus', { activeStatus: AssignmentStatus.ACTIVE })
      .andWhere('a.expiresAt < :now', { now })
      .orderBy('a.expiresAt', 'ASC')
      .getMany();

    return overdueAssignments.map((a) => {
      const diffMs = now.getTime() - new Date(a.expiresAt).getTime();
      const overdueMinutes = Math.floor(diffMs / (1000 * 60));
      return {
        assignmentId: a.id,
        lockerNumber: a.locker.lockerNumber,
        zone: a.locker.zone,
        cluster: a.locker.cluster,
        user: {
          id: a.user.id,
          fullName: a.user.fullName,
          email: a.user.email,
          phone: a.user.phone,
        },
        assignedAt: a.assignedAt,
        expiresAt: a.expiresAt,
        overdueMinutes,
      };
    });
  }

  async getStats() {
    const total = await this.lockerRepo.count();
    const vacant = await this.lockerRepo.count({ where: { status: LockerStatus.VACANT } });
    const inUse = await this.lockerRepo.count({ where: { status: LockerStatus.IN_USE } });
    const damaged = await this.lockerRepo.count({ where: { status: LockerStatus.DAMAGED } });
    const maintenance = await this.lockerRepo.count({ where: { status: LockerStatus.MAINTENANCE } });

    // Nhóm theo Zone
    const zones = await this.lockerRepo.createQueryBuilder('l')
      .select('l.zone', 'zone')
      .addSelect('COUNT(l.id)', 'total')
      .addSelect(`SUM(CASE WHEN l.status = 'VACANT' THEN 1 ELSE 0 END)`, 'vacant')
      .addSelect(`SUM(CASE WHEN l.status = 'IN_USE' THEN 1 ELSE 0 END)`, 'inUse')
      .groupBy('l.zone')
      .getRawMany();

    return {
      total,
      vacant,
      inUse,
      damaged,
      maintenance,
      zones,
    };
  }
}
