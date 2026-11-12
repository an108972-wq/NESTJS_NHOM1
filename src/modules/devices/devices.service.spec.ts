import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DevicesService } from './devices.service';
import { Device, DeviceStatus, DeviceCategory } from './entities/device.entity';
import { DeviceLoan, DeviceLoanStatus } from './entities/device-loan.entity';
import { DeviceMaintenance } from './entities/device-maintenance.entity';
import { User } from '../users/entities/user.entity';

describe('DevicesService', () => {
  let service: DevicesService;
  let deviceRepo: any;
  let loanRepo: any;
  let maintenanceRepo: any;
  let userRepo: any;

  beforeEach(() => {
    deviceRepo = {
      createQueryBuilder: vi.fn(),
      findOne: vi.fn(),
      create: vi.fn((dto) => ({ id: 1, ...dto })),
      save: vi.fn((entity) => Promise.resolve({ id: 1, ...entity })),
      remove: vi.fn(),
      count: vi.fn().mockResolvedValue(5),
    };

    loanRepo = {
      createQueryBuilder: vi.fn(),
      findOne: vi.fn(),
      create: vi.fn((dto) => ({ id: 10, ...dto })),
      save: vi.fn((entity) => Promise.resolve({ id: 10, ...entity })),
      count: vi.fn().mockResolvedValue(12),
    };

    maintenanceRepo = {
      createQueryBuilder: vi.fn(),
      findOne: vi.fn(),
      create: vi.fn((dto) => ({ id: 20, ...dto })),
      save: vi.fn((entity) => Promise.resolve({ id: 20, ...entity })),
    };

    userRepo = {
      findOne: vi.fn(),
    };

    service = new DevicesService(deviceRepo, loanRepo, maintenanceRepo, userRepo);
  });

  it('should create a new device when code does not exist', async () => {
    deviceRepo.findOne.mockResolvedValue(null);

    const result = await service.create({
      code: 'DEV-TEST-01',
      name: 'Laptop Dell Test',
      category: DeviceCategory.LAPTOP,
      hourlyFineRate: 15000,
    });

    expect(result).toBeDefined();
    expect(result.code).toBe('DEV-TEST-01');
    expect(deviceRepo.save).toHaveBeenCalled();
  });

  it('should create a loan and update device status to BORROWED', async () => {
    const mockDevice = { id: 1, code: 'DEV-01', status: DeviceStatus.AVAILABLE } as unknown as Device;
    const mockUser = { id: 5, fullName: 'Sinh Vien A' } as unknown as User;

    deviceRepo.findOne.mockResolvedValue(mockDevice);
    userRepo.findOne.mockResolvedValue(mockUser);

    const loan = await service.createLoan({
      deviceId: 1,
      userId: 5,
      durationHours: 3,
      preCondition: 'Máy mới nguyên tem',
    });

    expect(loan).toBeDefined();
    expect(mockDevice.status).toBe(DeviceStatus.BORROWED);
    expect(deviceRepo.save).toHaveBeenCalledWith(mockDevice);
  });

  it('should return loan and calculate overdue fine if returned late', async () => {
    const pastExpected = new Date(Date.now() - 110 * 60 * 1000); // Trễ ~1 tiếng 50 phút -> làm tròn trần = 2 tiếng
    const mockDevice = {
      id: 1,
      code: 'DEV-01',
      name: 'Laptop Dell Test',
      category: DeviceCategory.LAPTOP,
      serialNumber: 'SN123456',
      hourlyFineRate: 20000,
      status: DeviceStatus.BORROWED,
    } as unknown as Device;

    const mockLoan = {
      id: 10,
      device: mockDevice,
      user: { id: 5, fullName: 'Sinh Vien A' } as unknown as User,
      expectedReturnAt: pastExpected,
      status: DeviceLoanStatus.ACTIVE,
      fineAmount: 0,
    } as unknown as DeviceLoan;

    loanRepo.findOne.mockResolvedValue(mockLoan);

    const result = await service.returnLoan(10, {
      postCondition: 'Máy hoạt động tốt',
      accessoriesChecked: true,
    });

    expect(result.success).toBe(true);
    expect((mockLoan as any).fineAmount).toBe(40000); // 2 tiếng * 20.000
    expect(mockLoan.status).toBe(DeviceLoanStatus.OVERDUE);
    expect(mockDevice.status).toBe(DeviceStatus.AVAILABLE);
  });
});

