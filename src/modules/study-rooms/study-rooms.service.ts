import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { StudyRoom, RoomStatus } from './entities/study-room.entity';
import { RoomBooking, BookingStatus } from './entities/room-booking.entity';
import { RoomViolation } from './entities/room-violation.entity';
import { User } from '../users/entities/user.entity';
import {
  CreateStudyRoomDto,
  CreateRoomBookingDto,
  ReviewBookingDto,
} from './dto/study-room.dto';
import * as crypto from 'crypto';

@Injectable()
export class StudyRoomsService {
  constructor(
    @InjectRepository(StudyRoom)
    private readonly roomRepo: Repository<StudyRoom>,
    @InjectRepository(RoomBooking)
    private readonly bookingRepo: Repository<RoomBooking>,
    @InjectRepository(RoomViolation)
    private readonly violationRepo: Repository<RoomViolation>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  async findAll(status?: RoomStatus, search?: string) {
    const qb = this.roomRepo.createQueryBuilder('r');
    if (status) qb.andWhere('r.status = :status', { status });
    if (search) {
      qb.andWhere('(r.code LIKE :s OR r.name LIKE :s OR r.equipment LIKE :s)', {
        s: `%${search}%`,
      });
    }
    qb.orderBy('r.id', 'ASC');
    return qb.getMany();
  }

  async findOne(id: number) {
    const room = await this.roomRepo.findOne({ where: { id } });
    if (!room) throw new NotFoundException(`Phòng học #${id} không tồn tại`);
    return room;
  }

  async create(dto: CreateStudyRoomDto) {
    const existing = await this.roomRepo.findOne({ where: { code: dto.code } });
    if (existing) throw new BadRequestException(`Mã phòng ${dto.code} đã tồn tại`);
    const room = this.roomRepo.create({
      ...dto,
      qrToken: `ROOM-TOKEN-${crypto.randomBytes(4).toString('hex').toUpperCase()}`,
    });
    return this.roomRepo.save(room);
  }

  async update(id: number, dto: Partial<CreateStudyRoomDto>) {
    const room = await this.findOne(id);
    Object.assign(room, dto);
    return this.roomRepo.save(room);
  }

  async remove(id: number) {
    const room = await this.findOne(id);
    await this.roomRepo.remove(room);
    return { success: true, message: `Đã xóa phòng học #${id}` };
  }

  // --- LỊCH TRỰC QUAN & ĐẶT CHỖ ---
  async getCalendar(dateStr?: string) {
    const date = dateStr || new Date().toISOString().slice(0, 10);
    const rooms = await this.roomRepo.find({ order: { id: 'ASC' } });

    const bookings = await this.bookingRepo.createQueryBuilder('b')
      .leftJoinAndSelect('b.room', 'r')
      .leftJoinAndSelect('b.user', 'u')
      .where('b.date = :date', { date })
      .andWhere('b.status IN (:...validStatuses)', {
        validStatuses: [
          BookingStatus.PENDING,
          BookingStatus.APPROVED,
          BookingStatus.CHECKED_IN,
        ],
      })
      .orderBy('b.startTime', 'ASC')
      .getMany();

    return {
      date,
      rooms: rooms.map((room) => ({
        ...room,
        dayBookings: bookings.filter((b) => b.room.id === room.id),
      })),
    };
  }

  async bookRoom(userId: number, dto: CreateRoomBookingDto) {
    const room = await this.findOne(dto.roomId);
    if (room.status !== RoomStatus.ACTIVE) {
      throw new BadRequestException(`Phòng học này hiện không mở (Trạng thái: ${room.status})`);
    }

    // Kiểm tra người dùng có bị khóa quyền đặt phòng không
    const violation = await this.violationRepo.findOne({
      where: { user: { id: userId }, isBlocked: true },
    });
    if (violation) {
      const until = violation.blockedUntil ? ` đến ngày ${new Date(violation.blockedUntil).toLocaleDateString('vi-VN')}` : '';
      throw new ForbiddenException(`Tài khoản của bạn đang bị tạm khóa quyền đặt phòng học${until}. Lý do: ${violation.reason}`);
    }

    if (dto.memberCount && dto.memberCount > room.capacity) {
      throw new BadRequestException(`Số lượng thành viên (${dto.memberCount}) vượt quá sức chứa tối đa của phòng (${room.capacity} người)`);
    }

    // Kiểm tra giờ hoạt động
    if (dto.startTime < room.openingTime || dto.endTime > room.closingTime) {
      throw new BadRequestException(`Khung giờ đặt phải nằm trong giờ mở cửa của phòng (${room.openingTime} - ${room.closingTime})`);
    }

    // Kiểm tra thời lượng tối đa
    const [startH, startM] = dto.startTime.split(':').map(Number);
    const [endH, endM] = dto.endTime.split(':').map(Number);
    const durationHours = (endH * 60 + endM - (startH * 60 + startM)) / 60;
    if (durationHours <= 0) {
      throw new BadRequestException('Thời gian kết thúc phải lớn hơn thời gian bắt đầu');
    }
    if (durationHours > room.maxBookingHours) {
      throw new BadRequestException(`Thời lượng đặt phòng tối đa là ${room.maxBookingHours} tiếng (Bạn chọn: ${durationHours} tiếng)`);
    }

    // Kiểm tra trùng lịch
    const conflicts = await this.bookingRepo.createQueryBuilder('b')
      .where('b.roomId = :roomId', { roomId: room.id })
      .andWhere('b.date = :date', { date: dto.date })
      .andWhere('b.status IN (:...activeStatuses)', {
        activeStatuses: [BookingStatus.PENDING, BookingStatus.APPROVED, BookingStatus.CHECKED_IN],
      })
      .andWhere('NOT (b.endTime <= :start OR b.startTime >= :end)', {
        start: dto.startTime,
        end: dto.endTime,
      })
      .getMany();

    if (conflicts.length > 0) {
      throw new BadRequestException('Khung giờ này đã có nhóm khác đăng ký trước đó. Vui lòng chọn khung giờ khác.');
    }

    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('Người dùng không tồn tại');

    const booking = this.bookingRepo.create({
      room,
      user,
      groupName: dto.groupName,
      memberCount: dto.memberCount || 2,
      purpose: dto.purpose,
      date: dto.date,
      startTime: dto.startTime,
      endTime: dto.endTime,
      status: BookingStatus.PENDING,
      notes: dto.notes,
    });

    return this.bookingRepo.save(booking);
  }

  async reviewBooking(id: number, dto: ReviewBookingDto) {
    const booking = await this.bookingRepo.findOne({
      where: { id },
      relations: { room: true, user: true },
    });
    if (!booking) throw new NotFoundException(`Lịch đặt phòng #${id} không tồn tại`);

    booking.status = dto.status;
    if (dto.rejectionReason) booking.rejectionReason = dto.rejectionReason;

    await this.bookingRepo.save(booking);
    return {
      success: true,
      booking,
      message: dto.status === BookingStatus.APPROVED ? 'Đã phê duyệt yêu cầu đặt phòng!' : 'Đã từ chối yêu cầu đặt phòng.',
    };
  }

  async checkIn(bookingId: number, qrTokenProvided: string) {
    const booking = await this.bookingRepo.findOne({
      where: { id: bookingId },
      relations: { room: true, user: true },
    });
    if (!booking) throw new NotFoundException('Lịch đặt phòng không tồn tại');
    if (booking.status !== BookingStatus.APPROVED) {
      throw new BadRequestException(`Chỉ có thể check-in cho đơn đặt đã được duyệt (Trạng thái hiện tại: ${booking.status})`);
    }

    if (booking.room.qrToken !== qrTokenProvided) {
      throw new BadRequestException('Mã QR check-in tại cửa phòng không hợp lệ!');
    }

    booking.status = BookingStatus.CHECKED_IN;
    booking.checkedInAt = new Date();
    await this.bookingRepo.save(booking);

    return {
      success: true,
      message: `Check-in thành công cho nhóm ${booking.groupName}! Chúc các bạn học tập hiệu quả.`,
      booking,
    };
  }

  async autoCancelNoShow() {
    const today = new Date().toISOString().slice(0, 10);
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    const bookings = await this.bookingRepo.find({
      where: { date: today, status: BookingStatus.APPROVED },
      relations: { room: true, user: true },
    });

    const cancelled: RoomBooking[] = [];
    for (const b of bookings) {
      const [h, m] = b.startTime.split(':').map(Number);
      const bookingStartMinutes = h * 60 + m;
      // Nếu đã quá 15 phút so với giờ bắt đầu mà chưa check-in
      if (currentMinutes > bookingStartMinutes + 15) {
        b.status = BookingStatus.NO_SHOW;
        b.rejectionReason = 'Tự động hủy do không check-in sau 15 phút bắt đầu';
        await this.bookingRepo.save(b);
        cancelled.push(b);
      }
    }

    return {
      success: true,
      cancelledCount: cancelled.length,
      cancelledBookings: cancelled.map((c) => ({ id: c.id, groupName: c.groupName, room: c.room.name })),
    };
  }

  async findBookings(date?: string, status?: BookingStatus, userId?: number) {
    const qb = this.bookingRepo.createQueryBuilder('b')
      .leftJoinAndSelect('b.room', 'r')
      .leftJoinAndSelect('b.user', 'u');

    if (date) qb.andWhere('b.date = :date', { date });
    if (status) qb.andWhere('b.status = :status', { status });
    if (userId) qb.andWhere('u.id = :userId', { userId });

    qb.orderBy('b.date', 'DESC').addOrderBy('b.startTime', 'DESC');
    return qb.getMany();
  }

  async getStats() {
    const totalRooms = await this.roomRepo.count();
    const activeRooms = await this.roomRepo.count({ where: { status: RoomStatus.ACTIVE } });
    const totalBookings = await this.bookingRepo.count();
    const completedBookings = await this.bookingRepo.count({ where: { status: BookingStatus.CHECKED_IN } });
    const noShowBookings = await this.bookingRepo.count({ where: { status: BookingStatus.NO_SHOW } });

    return {
      totalRooms,
      activeRooms,
      totalBookings,
      completedBookings,
      noShowBookings,
      checkInRate: totalBookings > 0 ? Math.round((completedBookings / totalBookings) * 100) : 0,
    };
  }
}
