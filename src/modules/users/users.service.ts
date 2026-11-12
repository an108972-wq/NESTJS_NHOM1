import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { DataSource, In, Repository } from 'typeorm';
import { UserRole, READER_GROUP_LIMITS } from '../../common/constants/user-role';
import { Optional } from '@nestjs/common';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { BorrowRecord, BorrowStatus } from '../borrow-records/entities/borrow-record.entity';
import { Reservation, ReservationStatus } from '../reservations/entities/reservation.entity';
import { SettingsService } from '../settings/settings.service';
import { FineViolation } from '../borrow-records/entities/fine-violation.entity';
import { CreateUserDto } from './dto/create-user.dto.js';
import { UpdateUserDto } from './dto/update-user.dto.js';
import { User } from './entities/user.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User) private readonly usersRepository: Repository<User>,
    @InjectRepository(BorrowRecord) private readonly borrowRepository: Repository<BorrowRecord>,
    @InjectRepository(Reservation) private readonly reservationsRepository: Repository<Reservation>,
    @InjectRepository(FineViolation)
    private readonly fineViolationRepository: Repository<FineViolation>,
    private readonly dataSource: DataSource,
    private readonly settingsService: SettingsService,
    @Optional() private readonly auditLogsService?: AuditLogsService,
  ) {}

  async create(dto: CreateUserDto, performer?: any) {
    if (await this.usersRepository.findOneBy({ username: dto.username })) {
      throw new BadRequestException('Tài khoản đã tồn tại');
    }
    if (dto.email && (await this.usersRepository.findOneBy({ email: dto.email }))) {
      throw new BadRequestException('Email đã được sử dụng');
    }

    const settings = await this.settingsService.getSettings();
    const isReader = (dto.role ?? UserRole.READER) === UserRole.READER;
    const readerGroup = dto.readerGroup || (isReader ? 'STUDENT' : null);
    const groupLimit = readerGroup && READER_GROUP_LIMITS[readerGroup] ? READER_GROUP_LIMITS[readerGroup].maxActiveLoans : settings.maxActiveLoans;
    const maxActiveLoans = dto.maxActiveLoans ?? groupLimit;
    if (dto.maxActiveLoans && dto.maxActiveLoans > settings.maxActiveLoans) {
      throw new BadRequestException(
        `Giới hạn mượn không được vượt quá ${settings.maxActiveLoans} sách theo cấu hình thư viện`,
      );
    }

    const user = this.usersRepository.create({
      username: dto.username,
      fullName: dto.fullName,
      phone: dto.phone,
      email: dto.email,
      role: dto.role ?? UserRole.READER,
      cardNumber: dto.cardNumber || null,
      readerGroup,
      customPermissions: dto.customPermissions || null,
      maxActiveLoans,
      libraryCardIssuedAt: isReader ? new Date() : null,
      libraryCardExpiresAt: isReader ? new Date(Date.now() + 365 * 86400000) : null,
      passwordHash: await bcrypt.hash(dto.password, 10),
      isActive: true,
      approvedAt: new Date(),
    });
    const saved = await this.usersRepository.save(user);
    if (!saved.cardNumber && isReader) {
      saved.cardNumber = `TV-${String(saved.id).padStart(6, '0')}`;
      await this.usersRepository.save(saved);
    }
    if (this.auditLogsService) {
      await this.auditLogsService.log({
        action: 'CREATE_USER',
        module: 'USERS',
        description: `Tạo tài khoản ${saved.username} (Vai trò: ${saved.role}${readerGroup ? ', Nhóm: ' + readerGroup : ''})`,
        performerId: performer?.userId || performer?.id,
        performerName: performer?.username,
        performerRole: performer?.role,
      });
    }
    return this.toPublicUser(saved);
  }

  async findAll() {
    const users = await this.usersRepository.find({ order: { id: 'ASC' } });
    return users.map((user) => this.toPublicUser(user));
  }

  async findOne(id: number) {
    return this.toPublicUser(await this.getUser(id));
  }

  async findBorrowHistory(id: number) {
    await this.getUser(id);
    return this.borrowRepository.find({
      where: { user: { id } },
      relations: { book: true, copy: true },
      order: { borrowedAt: 'DESC' },
    });
  }

  async findProfile(id: number) {
    const [user, loans, reservations, settings, manualViolations] = await Promise.all([
      this.getUser(id),
      this.borrowRepository.find({
        where: { user: { id } },
        relations: { book: true, copy: true },
        order: { borrowedAt: 'DESC' },
      }),
      this.reservationsRepository.find({
        where: {
          user: { id },
          status: In([ReservationStatus.WAITING, ReservationStatus.READY]),
        },
        relations: { book: true, copy: true },
        order: { createdAt: 'ASC' },
      }),
      this.settingsService.getSettings(),
      this.fineViolationRepository.find({
        where: { user: { id } },
        relations: { copy: { book: true } },
        order: { createdAt: 'DESC' },
      }),
    ]);
    const now = new Date();
    const profileLoans = loans.map((loan) => {
      const dueDate = loan.dueDate ? new Date(loan.dueDate) : null;
      const daysLate =
        loan.status === BorrowStatus.BORROWED && dueDate && now > dueDate
          ? Math.ceil((now.getTime() - dueDate.getTime()) / 86_400_000)
          : 0;
      return {
        ...loan,
        estimatedFineAmount: daysLate * settings.dailyFineRate,
      };
    });
    const totalFineAmount = profileLoans.reduce(
      (total, loan) => total + Number(loan.fineAmount || 0),
      0,
    ) + profileLoans.reduce((total, loan) => total + loan.estimatedFineAmount, 0);
    const unpaidFineAmount = profileLoans
      .filter((loan) => loan.fineStatus === 'UNPAID')
      .reduce((total, loan) => total + Number(loan.fineAmount || 0), 0) +
      profileLoans.reduce((total, loan) => total + loan.estimatedFineAmount, 0);
    const totalManualFineAmount = manualViolations.reduce(
      (total, fine) => total + Number(fine.fineAmount || 0),
      0,
    );
    const unpaidManualFineAmount = manualViolations
      .filter((fine) => fine.fineStatus === 'UNPAID')
      .reduce((total, fine) => total + Number(fine.fineAmount || 0), 0);

    const returnedLoans = profileLoans.filter((l) => l.status === BorrowStatus.RETURNED);
    const returnedOnTimeCount = returnedLoans.filter((l) => {
      const due = l.dueDate ? new Date(l.dueDate).getTime() : 0;
      const ret = l.returnedAt ? new Date(l.returnedAt).getTime() : 0;
      return ret <= due;
    }).length;
    const onTimeRate = returnedLoans.length
      ? Math.round((returnedOnTimeCount / returnedLoans.length) * 100)
      : 100;
    const overdueCount = profileLoans.filter(
      (l) => l.status === BorrowStatus.BORROWED && l.estimatedFineAmount > 0,
    ).length;

    const catMap = new Map<string, number>();
    profileLoans.forEach((l) => {
      const cat = (l as any).book?.category?.name || 'Tổng hợp';
      catMap.set(cat, (catMap.get(cat) || 0) + 1);
    });
    let favoriteCategory = 'Tổng hợp';
    let maxCatCount = 0;
    catMap.forEach((count, cat) => {
      if (count > maxCatCount) {
        maxCatCount = count;
        favoriteCategory = cat;
      }
    });

    let readingRank = '🌱 Độc giả Tiềm Năng';
    if (overdueCount > 0 && (unpaidFineAmount + unpaidManualFineAmount) > 50000) {
      readingRank = '⚠️ Cần nhắc hạn trả';
    } else if (profileLoans.length >= 20 && onTimeRate >= 90) {
      readingRank = '🏆 Độc giả Kim Cương';
    } else if (profileLoans.length >= 10 && onTimeRate >= 80) {
      readingRank = '🥇 Độc giả Tiêu Biểu';
    } else if (profileLoans.length >= 4) {
      readingRank = '🥈 Độc giả Tích Cực';
    }

    const readingScore = Math.min(
      100,
      Math.round(profileLoans.length * 4 + onTimeRate * 0.4),
    );

    const readingStats = {
      totalBorrowed: profileLoans.length,
      returnedCount: returnedLoans.length,
      returnedOnTimeCount,
      onTimeRate,
      overdueCount,
      favoriteCategory,
      readingRank,
      readingScore,
    };

    return {
      user: this.toPublicUser(user),
      loans: profileLoans,
      currentLoans: profileLoans.filter((loan) => loan.status === BorrowStatus.BORROWED),
      reservations,
      manualViolations,
      readingStats,
      totalFineAmount: totalFineAmount + totalManualFineAmount,
      unpaidFineAmount: unpaidFineAmount + unpaidManualFineAmount,
      paidFineAmount: profileLoans
        .filter((loan) => loan.fineStatus === 'PAID')
        .reduce((total, loan) => total + Number(loan.fineAmount || 0), 0) +
        manualViolations
          .filter((fine) => fine.fineStatus === 'PAID')
          .reduce((total, fine) => total + Number(fine.fineAmount || 0), 0),
    };
  }

  async getStaffPerformance(staffId?: number) {
    const qb = this.usersRepository.createQueryBuilder('u')
      .where('u.role IN (:...roles)', {
        roles: [UserRole.ADMIN, UserRole.LIBRARIAN, UserRole.COUNTER_LIBRARIAN, UserRole.INVENTORY_LIBRARIAN],
      });
    if (staffId) {
      qb.andWhere('u.id = :staffId', { staffId });
    }
    const staffs = await qb.orderBy('u.id', 'ASC').getMany();

    return Promise.all(
      staffs.map(async (staff) => {
        const perf = this.auditLogsService
          ? await this.auditLogsService.getStaffPerformance(staff.id, staff.username)
          : {
              totalActions: 0,
              borrowsHandled: 0,
              inventoryAudits: 0,
              acquisitionsHandled: 0,
              finesHandled: 0,
              lastActiveAt: null,
              recentLogs: [],
            };
        return {
          id: staff.id,
          username: staff.username,
          fullName: staff.fullName,
          role: staff.role,
          email: staff.email,
          phone: staff.phone,
          isActive: staff.isActive,
          createdAt: staff.createdAt,
          metrics: perf,
        };
      }),
    );
  }

  async update(id: number, dto: UpdateUserDto, performer?: any) {
    return this.dataSource.transaction(async (manager) => {
      const user = await manager.findOne(User, {
        where: { id },
        lock: { mode: 'pessimistic_write' },
      });
      if (!user) throw new NotFoundException('Không tìm thấy người dùng');

      if (dto.maxActiveLoans !== undefined) {
        const settings = await this.settingsService.getSettings();
        if (dto.maxActiveLoans > settings.maxActiveLoans) {
          throw new BadRequestException(
            `Giới hạn mượn không được vượt quá ${settings.maxActiveLoans} sách theo cấu hình thư viện`,
          );
        }
        const activeLoanCount = await manager.count(BorrowRecord, {
          where: {
            user: { id },
            status: In([BorrowStatus.PENDING, BorrowStatus.BORROWED]),
          },
        });
        if (dto.maxActiveLoans < activeLoanCount) {
          throw new BadRequestException(
            `Giới hạn mới không thể thấp hơn ${activeLoanCount} phiếu mượn đang hoạt động`,
          );
        }
      }
      if (dto.email && dto.email !== user.email) {
        const emailUser = await manager.findOneBy(User, { email: dto.email });
        if (emailUser) throw new BadRequestException('Email đã được sử dụng');
      }
      if (dto.libraryCardIssuedAt !== undefined) {
        user.libraryCardIssuedAt = dto.libraryCardIssuedAt
          ? new Date(dto.libraryCardIssuedAt)
          : null;
      }
      if (dto.libraryCardExpiresAt !== undefined) {
        user.libraryCardExpiresAt = dto.libraryCardExpiresAt
          ? new Date(dto.libraryCardExpiresAt)
          : null;
      }
      if (
        user.libraryCardIssuedAt &&
        user.libraryCardExpiresAt &&
        new Date(user.libraryCardExpiresAt).getTime() <
          new Date(user.libraryCardIssuedAt).getTime()
      ) {
        throw new BadRequestException('Ngày hết hạn thẻ không thể trước ngày cấp');
      }
      if (
        dto.isActive !== undefined &&
        !user.approvedAt &&
        (dto.isActive || user.isActive)
      ) {
        user.approvedAt = new Date();
      }
      if (dto.isActive && user.role === UserRole.READER && !user.libraryCardIssuedAt) {
        user.libraryCardIssuedAt = new Date();
      }
      await this.preventRemovingLastAdmin(user, { role: dto.role, isActive: dto.isActive });
      const { libraryCardIssuedAt: _issuedAt, libraryCardExpiresAt: _expiresAt, ...updates } =
        dto;
      Object.assign(user, updates);
      return this.toPublicUser(await manager.save(user));
    });
  }

  async updateStatus(id: number, isActive: boolean, performer?: any) {
    const user = await this.getUser(id);
    await this.preventRemovingLastAdmin(user, { isActive });
    if (!user.approvedAt && user.isActive) user.approvedAt = new Date();
    if (isActive && !user.approvedAt) user.approvedAt = new Date();
    if (isActive && user.role === UserRole.READER && !user.libraryCardIssuedAt) {
      user.libraryCardIssuedAt = new Date();
      user.libraryCardExpiresAt = new Date(Date.now() + 365 * 86400000);
    }
    user.isActive = isActive;
    const saved = await this.usersRepository.save(user);

    if (!isActive) {
      await this.reservationsRepository.update(
        { user: { id: user.id }, status: ReservationStatus.WAITING },
        { status: ReservationStatus.CANCELLED },
      );
      if (this.auditLogsService) {
        await this.auditLogsService.log({
          action: 'LOCK_USER',
          module: 'USERS',
          description: `Khóa tài khoản độc giả ${user.fullName || user.username} và hủy đồng bộ các yêu cầu đặt trước đang chờ`,
          performerId: performer?.userId || performer?.id,
          performerName: performer?.username,
          performerRole: performer?.role,
        });
      }
    } else {
      if (this.auditLogsService) {
        await this.auditLogsService.log({
          action: 'UNLOCK_USER',
          module: 'USERS',
          description: `Mở khóa tài khoản người dùng ${user.fullName || user.username}`,
          performerId: performer?.userId || performer?.id,
          performerName: performer?.username,
          performerRole: performer?.role,
        });
      }
    }

    return this.toPublicUser(saved);
  }

  async reissueLibraryCard(id: number, performer?: any) {
    const user = await this.getUser(id);
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const newCardNumber = `TV-${String(user.id).padStart(5, '0')}-${randomSuffix}`;
    user.cardNumber = newCardNumber;
    user.libraryCardIssuedAt = new Date();
    user.libraryCardExpiresAt = new Date(Date.now() + 365 * 86400000);
    user.isActive = true;
    const saved = await this.usersRepository.save(user);

    if (this.auditLogsService) {
      await this.auditLogsService.log({
        action: 'REISSUE_CARD',
        module: 'USERS',
        description: `Cấp lại thẻ thư viện cho độc giả ${user.fullName || user.username} (Mã thẻ mới: ${newCardNumber})`,
        performerId: performer?.userId || performer?.id,
        performerName: performer?.username,
        performerRole: performer?.role,
      });
    }

    return this.toPublicUser(saved);
  }

  // TỰ ĐỘNG QUÉT VÀ KHÓA TÀI KHOẢN ĐỘC GIẢ VI PHẠM (QUÁ HẠN > 7 NGÀY HOẶC PHẠT > 100K)
  async autoLockOverdueReaders(performer?: any) {
    const activeReaders = await this.usersRepository.find({
      where: { role: UserRole.READER, isActive: true },
    });
    const now = new Date();
    const lockedUsers: any[] = [];

    for (const reader of activeReaders) {
      // 1. Kiểm tra sách mượn quá hạn > 7 ngày
      const loans = await this.borrowRepository.find({
        where: { user: { id: reader.id }, status: BorrowStatus.BORROWED },
      });

      let hasOverdueOver7Days = false;
      for (const loan of loans) {
        if (loan.dueDate) {
          const dueTime = new Date(loan.dueDate).getTime();
          const diffDays = Math.floor((now.getTime() - dueTime) / (1000 * 60 * 60 * 24));
          if (diffDays >= 7) {
            hasOverdueOver7Days = true;
            break;
          }
        }
      }

      // 2. Kiểm tra tổng tiền phạt chưa trả
      const violations = await this.fineViolationRepository.find({
        where: { user: { id: reader.id }, fineStatus: 'UNPAID' },
      });
      const totalUnpaidFines = violations.reduce((sum, v) => sum + Number(v.fineAmount || 0), 0);
      const isFineOverLimit = totalUnpaidFines > 100000;

      if (hasOverdueOver7Days || isFineOverLimit) {
        reader.isActive = false;
        await this.usersRepository.save(reader);

        // Hủy các đặt trước đang chờ
        await this.reservationsRepository.update(
          { user: { id: reader.id }, status: ReservationStatus.WAITING },
          { status: ReservationStatus.CANCELLED },
        );

        if (this.auditLogsService) {
          await this.auditLogsService.log({
            action: 'AUTO_LOCK_VIOLATION',
            module: 'USERS',
            description: `Tự động khóa tài khoản độc giả ${reader.fullName || reader.username} (Lý do: ${hasOverdueOver7Days ? 'Quá hạn > 7 ngày' : ''}${isFineOverLimit ? ' / Phạt nợ > 100k' : ''})`,
            performerId: performer?.userId || performer?.id,
            performerName: performer?.username || 'Hệ thống tự động',
            performerRole: performer?.role || 'SYSTEM',
          });
        }

        lockedUsers.push({
          id: reader.id,
          username: reader.username,
          fullName: reader.fullName,
          reason: hasOverdueOver7Days ? 'Quá hạn trả sách trên 7 ngày' : 'Nợ tiền phạt vi phạm vượt quá 100.000 ₫',
        });
      }
    }

    return {
      message: lockedUsers.length
        ? `Đã tự động khóa ${lockedUsers.length} tài khoản độc giả vi phạm nghiêm trọng.`
        : 'Không có tài khoản độc giả nào vi phạm vượt ngưỡng cần khóa.',
      lockedCount: lockedUsers.length,
      lockedUsers,
    };
  }

  async remove(id: number) {
    return this.updateStatus(id, false);
  }

  private async getUser(id: number) {
    const user = await this.usersRepository.findOneBy({ id });
    if (!user) throw new NotFoundException('Không tìm thấy người dùng');
    return user;
  }

  private async preventRemovingLastAdmin(user: User, changes: Partial<User>) {
    const isBeingDemoted = changes.role !== undefined && changes.role !== UserRole.ADMIN;
    const isBeingDisabled = changes.isActive === false;
    if (user.role === UserRole.ADMIN && user.isActive && (isBeingDemoted || isBeingDisabled)) {
      const activeAdmins = await this.usersRepository.countBy({ role: UserRole.ADMIN, isActive: true });
      if (activeAdmins <= 1) {
        throw new BadRequestException('Không thể khóa hoặc hạ quyền Admin hoạt động cuối cùng');
      }
    }
  }

  private toPublicUser(user: User) {
    return {
      id: user.id,
      username: user.username,
      fullName: user.fullName,
      phone: user.phone,
      email: user.email,
      role: user.role,
      cardNumber: user.cardNumber || `TV-${String(user.id).padStart(6, '0')}`,
      readerGroup: user.readerGroup || (user.role === UserRole.READER ? 'STUDENT' : null),
      customPermissions: user.customPermissions || null,
      isActive: user.isActive,
      approvedAt: user.approvedAt,
      maxActiveLoans: user.maxActiveLoans,
      libraryCardIssuedAt: user.libraryCardIssuedAt,
      libraryCardExpiresAt: user.libraryCardExpiresAt,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}
