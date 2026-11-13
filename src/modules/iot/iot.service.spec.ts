import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { IotService } from './iot.service';
import { IotDevice, IotDeviceStatus, IotDeviceType } from './entities/iot-device.entity';
import { IotAlert } from './entities/iot-alert.entity';
import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('IotService', () => {
  let service: IotService;

  const mockDevice = {
    id: 1,
    deviceCode: 'RFID-GATE-MAIN',
    name: 'Cổng từ RFID',
    type: IotDeviceType.RFID_GATE,
    status: IotDeviceStatus.ONLINE,
    powerState: true,
    rfidScansToday: 100,
    rfidAlertsToday: 1,
    temperature: 22.0,
    humidity: 50.0,
  };

  const mockDeviceRepo = {
    count: vi.fn().mockResolvedValue(1),
    find: vi.fn().mockResolvedValue([mockDevice]),
    findOne: vi.fn().mockResolvedValue(mockDevice),
    create: vi.fn().mockImplementation((dto) => dto),
    save: vi.fn().mockImplementation((dev) => Promise.resolve({ id: 1, ...dev })),
    remove: vi.fn().mockResolvedValue(mockDevice),
    createQueryBuilder: vi.fn(() => ({
      andWhere: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      addOrderBy: vi.fn().mockReturnThis(),
      getMany: vi.fn().mockResolvedValue([mockDevice]),
    })),
  };

  const mockAlertRepo = {
    count: vi.fn().mockResolvedValue(1),
    find: vi.fn().mockResolvedValue([]),
    findOne: vi.fn().mockResolvedValue({ id: 1, resolved: false }),
    create: vi.fn().mockImplementation((dto) => dto),
    save: vi.fn().mockImplementation((a) => Promise.resolve({ id: 1, ...a })),
    createQueryBuilder: vi.fn(() => ({
      andWhere: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      getMany: vi.fn().mockResolvedValue([]),
    })),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IotService,
        {
          provide: getRepositoryToken(IotDevice),
          useValue: mockDeviceRepo,
        },
        {
          provide: getRepositoryToken(IotAlert),
          useValue: mockAlertRepo,
        },
      ],
    }).compile();

    service = module.get<IotService>(IotService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('gets stats accurately', async () => {
    const stats = await service.getStats();
    expect(stats.total).toBe(1);
    expect(stats.online).toBe(1);
    expect(stats.rfidTotalScans).toBe(100);
  });

  it('executes toggle power action', async () => {
    const res = await service.executeAction(1, { action: 'TOGGLE_POWER' });
    expect(res.success).toBe(true);
    expect(res.device.powerState).toBe(false);
  });
});

