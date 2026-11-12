import { describe, it, expect, beforeEach, vi } from 'vitest';
import { LockersService } from './lockers.service';
import { Locker, LockerStatus } from './entities/locker.entity';
import { LockerAssignment, AssignmentStatus } from './entities/locker-assignment.entity';
import { User } from '../users/entities/user.entity';

describe('LockersService', () => {
  let service: LockersService;
  let lockerRepo: any;
  let assignRepo: any;
  let userRepo: any;

  beforeEach(() => {
    lockerRepo = {
      findOne: vi.fn(),
      find: vi.fn().mockResolvedValue([]),
      create: vi.fn((dto) => ({ id: 1, ...dto })),
      save: vi.fn((entity) => Promise.resolve({ id: 1, ...entity })),
      count: vi.fn().mockResolvedValue(20),
    };

    assignRepo = {
      findOne: vi.fn(),
      create: vi.fn((dto) => ({ id: 100, ...dto })),
      save: vi.fn((entity) => Promise.resolve({ id: 100, ...entity })),
    };

    userRepo = {
      findOne: vi.fn().mockResolvedValue({ id: 8, fullName: 'Độc giả B' }),
    };

    service = new LockersService(lockerRepo, assignRepo, userRepo);
  });

  it('should assign a locker and generate a 4-digit PIN', async () => {
    const mockLocker = { id: 1, lockerNumber: 'LK-A-01', status: LockerStatus.VACANT };
    lockerRepo.findOne.mockResolvedValue(mockLocker);

    const result = await service.assignLocker({
      lockerId: 1,
      userId: 8,
    });

    expect(result.success).toBe(true);
    expect(result.pinCode).toBeDefined();
    expect(result.pinCode.length).toBe(4);
    expect(mockLocker.status).toBe(LockerStatus.IN_USE);
    expect(lockerRepo.save).toHaveBeenCalledWith(mockLocker);
  });

  it('should release a locker and reset status to VACANT', async () => {
    const mockLocker = {
      id: 1,
      lockerNumber: 'LK-A-01',
      status: LockerStatus.IN_USE,
      currentPin: '1234',
    };
    const mockAssignment = {
      id: 100,
      expiresAt: new Date(Date.now() + 3600000), // Chưa quá hạn
      status: AssignmentStatus.ACTIVE,
    };

    lockerRepo.findOne.mockResolvedValue(mockLocker);
    assignRepo.findOne.mockResolvedValue(mockAssignment);

    const result = await service.releaseLocker(1);

    expect(result.success).toBe(true);
    expect(mockLocker.status).toBe(LockerStatus.VACANT);
    expect(mockLocker.currentPin).toBeNull();
    expect(mockAssignment.status).toBe(AssignmentStatus.RETURNED);
    expect(lockerRepo.save).toHaveBeenCalledWith(mockLocker);
  });

  it('should reset PIN for an active locker', async () => {
    const mockLocker = {
      id: 1,
      lockerNumber: 'LK-A-01',
      status: LockerStatus.IN_USE,
      currentPin: '1111',
    };
    const mockAssignment = {
      id: 100,
      status: AssignmentStatus.ACTIVE,
    };

    lockerRepo.findOne.mockResolvedValue(mockLocker);
    assignRepo.findOne.mockResolvedValue(mockAssignment);

    const result = await service.resetPin(1);

    expect(result.success).toBe(true);
    expect(result.newPin).toBeDefined();
    expect(mockLocker.currentPin).toBe(result.newPin);
  });
});

