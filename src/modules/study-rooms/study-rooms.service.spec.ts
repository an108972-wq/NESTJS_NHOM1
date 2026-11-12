import { describe, it, expect, beforeEach, vi } from 'vitest';
import { StudyRoomsService } from './study-rooms.service';
import { StudyRoom, RoomStatus } from './entities/study-room.entity';
import { RoomBooking, BookingStatus } from './entities/room-booking.entity';
import { RoomViolation } from './entities/room-violation.entity';
import { User } from '../users/entities/user.entity';

describe('StudyRoomsService', () => {
  let service: StudyRoomsService;
  let roomRepo: any;
  let bookingRepo: any;
  let violationRepo: any;
  let userRepo: any;

  beforeEach(() => {
    roomRepo = {
      findOne: vi.fn(),
      find: vi.fn().mockResolvedValue([]),
      create: vi.fn((dto) => ({ id: 1, ...dto })),
      save: vi.fn((entity) => Promise.resolve({ id: 1, ...entity })),
      count: vi.fn().mockResolvedValue(4),
    };

    bookingRepo = {
      createQueryBuilder: vi.fn(() => ({
        where: vi.fn().mockReturnThis(),
        andWhere: vi.fn().mockReturnThis(),
        getMany: vi.fn().mockResolvedValue([]), // No conflicts by default
      })),
      findOne: vi.fn(),
      find: vi.fn().mockResolvedValue([]),
      create: vi.fn((dto) => ({ id: 50, ...dto })),
      save: vi.fn((entity) => Promise.resolve({ id: 50, ...entity })),
      count: vi.fn().mockResolvedValue(10),
    };

    violationRepo = {
      findOne: vi.fn().mockResolvedValue(null), // No violations by default
    };

    userRepo = {
      findOne: vi.fn().mockResolvedValue({ id: 2, fullName: 'Truong Nhom' }),
    };

    service = new StudyRoomsService(roomRepo, bookingRepo, violationRepo, userRepo);
  });

  it('should book a room successfully when slots are available', async () => {
    const mockRoom = {
      id: 1,
      name: 'Phòng 301',
      capacity: 8,
      status: RoomStatus.ACTIVE,
      openingTime: '08:00',
      closingTime: '21:00',
      maxBookingHours: 2,
    };
    roomRepo.findOne.mockResolvedValue(mockRoom);

    const booking = await service.bookRoom(2, {
      roomId: 1,
      groupName: 'Nhóm AI Capstone',
      memberCount: 5,
      date: '2026-11-10',
      startTime: '09:00',
      endTime: '11:00',
    });

    expect(booking).toBeDefined();
    expect(booking.status).toBe(BookingStatus.PENDING);
    expect(bookingRepo.save).toHaveBeenCalled();
  });

  it('should reject booking if member count exceeds room capacity', async () => {
    const mockRoom = {
      id: 1,
      capacity: 4,
      status: RoomStatus.ACTIVE,
      openingTime: '08:00',
      closingTime: '21:00',
      maxBookingHours: 2,
    };
    roomRepo.findOne.mockResolvedValue(mockRoom);

    await expect(
      service.bookRoom(2, {
        roomId: 1,
        groupName: 'Nhóm Lớp Đông',
        memberCount: 10,
        date: '2026-11-10',
        startTime: '09:00',
        endTime: '10:00',
      }),
    ).rejects.toThrow('vượt quá sức chứa tối đa');
  });

  it('should check in with matching qrToken', async () => {
    const mockBooking = {
      id: 50,
      groupName: 'Nhóm 1',
      status: BookingStatus.APPROVED,
      room: { qrToken: 'VALID-TOKEN-123' },
    };
    bookingRepo.findOne.mockResolvedValue(mockBooking);

    const result = await service.checkIn(50, 'VALID-TOKEN-123');

    expect(result.success).toBe(true);
    expect(mockBooking.status).toBe(BookingStatus.CHECKED_IN);
    expect(bookingRepo.save).toHaveBeenCalled();
  });
});

