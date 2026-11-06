import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { DataSource, In, Repository } from 'typeorm';
import { UserRole } from '../../common/constants/user-role';
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
  ) {}

  async create(dto: CreateUserDto) {
    if (await this.usersRepository.findOneBy({ username: dto.username })) {
      throw new BadRequestException('Tài khoản đã tồn tại');
    }
    if (dto.email && (await this.usersRepository.findOneBy({ email: dto.email }))) {
      throw new BadRequestException('Email đã được sử dụng');
    }

    const settings = await this.settingsService.getSettings();
    const maxActiveLoans = dto.maxActiveLoans ?? settings.maxActiveLoans;
    if (maxActiveLoans > settings.maxActiveLoans) {
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
      maxActiveLoans,
      libraryCardIssuedAt: (dto.role ?? UserRole.READER) === UserRole.READER ? new Date() : null,
      libraryCardExpiresAt: null,
      passwordHash: await bcrypt.hash(dto.password, 10),
      isActive: true,
      approvedAt: new Date(),
    });
    return this.toPublicUser(await this.usersRepository.save(user));
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

    return {
      user: this.toPublicUser(user),
      loans: profileLoans,
      currentLoans: profileLoans.filter((loan) => loan.status === BorrowStatus.BORROWED),
      reservations,
      manualViolations,
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

  async update(id: number, dto: UpdateUserDto) {
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

  async updateStatus(id: number, isActive: boolean) {
    const user = await this.getUser(id);
    await this.preventRemovingLastAdmin(user, { isActive });
    if (!user.approvedAt && user.isActive) user.approvedAt = new Date();
    if (isActive && !user.approvedAt) user.approvedAt = new Date();
    if (isActive && user.role === UserRole.READER && !user.libraryCardIssuedAt) {
      user.libraryCardIssuedAt = new Date();
    }
    user.isActive = isActive;
    return this.toPublicUser(await this.usersRepository.save(user));
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
