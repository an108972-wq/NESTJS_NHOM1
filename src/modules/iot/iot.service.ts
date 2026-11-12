import { Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  IotDevice,
  IotDeviceStatus,
  IotDeviceType,
} from './entities/iot-device.entity';
import {
  CreateIotDeviceDto,
  DeviceActionDto,
  UpdateIotDeviceDto,
} from './dto/iot-device.dto';

@Injectable()
export class IotService implements OnModuleInit {
  constructor(
    @InjectRepository(IotDevice)
    private readonly deviceRepo: Repository<IotDevice>,
  ) {}

  async onModuleInit() {
    await this.seedIotDevicesIfEmpty();
  }

  private async seedIotDevicesIfEmpty() {
    const count = await this.deviceRepo.count();
    if (count > 0) return;

    const sampleDevices = [
      this.deviceRepo.create({
        deviceCode: 'RFID-GATE-MAIN',
        name: 'Hệ Thống Cổng Từ An Ninh RFID Cửa Chính (Làn 1 & 2)',
        type: IotDeviceType.RFID_GATE,
        location: 'Sảnh chính Tầng 1 - Cửa ra vào trung tâm',
        status: IotDeviceStatus.ONLINE,
        ipAddress: '192.168.10.101',
        macAddress: 'D8:3A:DD:4A:21:01',
        firmwareVersion: 'v3.4.2-RFID-PRO',
        rfidScansToday: 1485,
        rfidAlertsToday: 2,
        powerState: true,
        batteryLevel: 100,
        lastPingAt: new Date(),
        note: 'Độ nhạy 99.8%. Tự động chụp ảnh độc giả khi chuông báo động kích hoạt.',
      }),
      this.deviceRepo.create({
        deviceCode: 'RFID-GATE-FLOOR2',
        name: 'Cổng Từ Giám Sát Lối Vào Phòng Sách Chuyên Khảo',
        type: IotDeviceType.RFID_GATE,
        location: 'Lối vào Khu Tài liệu Ngoại văn - Tầng 2',
        status: IotDeviceStatus.ONLINE,
        ipAddress: '192.168.10.102',
        macAddress: 'D8:3A:DD:4A:21:02',
        firmwareVersion: 'v3.4.2-RFID-PRO',
        rfidScansToday: 820,
        rfidAlertsToday: 0,
        powerState: true,
        batteryLevel: 100,
        lastPingAt: new Date(),
        note: 'Kết nối mạng nội bộ VLAN Thiết bị an ninh.',
      }),
      this.deviceRepo.create({
        deviceCode: 'ENV-SENSOR-ARCHIVE',
        name: 'Trạm Cảm Biến Môi Trường Kho Lưu Trữ Sách Quý & Luận Án',
        type: IotDeviceType.ENV_SENSOR,
        location: 'Kho Lưu Trữ Đặc Biệt - Phòng 305 (Tầng 3)',
        status: IotDeviceStatus.ONLINE,
        ipAddress: '192.168.10.120',
        macAddress: 'B4:E6:2D:11:88:C4',
        firmwareVersion: 'v2.1.0-ENV',
        temperature: 20.8,
        humidity: 53.5,
        powerState: true,
        batteryLevel: 98,
        lastPingAt: new Date(),
        note: 'Tiêu chuẩn bảo quản sách quý: Nhiệt độ 18°C-22°C, Độ ẩm 50%-60% RH. Cảnh báo tự động nếu vượt ngưỡng.',
      }),
      this.deviceRepo.create({
        deviceCode: 'ENV-SENSOR-SERVER',
        name: 'Cảm Biến Nhiệt/Ẩm Phòng Máy Chủ & Hạ Tầng Số (Data Center)',
        type: IotDeviceType.ENV_SENSOR,
        location: 'Phòng Máy Chủ DC - Tầng B1',
        status: IotDeviceStatus.ONLINE,
        ipAddress: '192.168.10.121',
        macAddress: 'B4:E6:2D:11:88:E2',
        firmwareVersion: 'v2.1.0-ENV',
        temperature: 19.5,
        humidity: 48.2,
        powerState: true,
        batteryLevel: 100,
        lastPingAt: new Date(),
        note: 'Theo dõi 24/7 nhiệt độ tủ Rack máy chủ ứng dụng thư viện.',
      }),
      this.deviceRepo.create({
        deviceCode: 'SMART-AC-ZONE-A',
        name: 'Hệ Thống Điều Hòa Trung Tâm VRV - Khu Đọc Tự Do (Zone A)',
        type: IotDeviceType.SMART_AC,
        location: 'Hội trường đọc tự do - Tầng 1',
        status: IotDeviceStatus.ONLINE,
        ipAddress: '192.168.10.140',
        macAddress: '70:B3:D5:E1:90:3A',
        firmwareVersion: 'v1.8.9-HVAC-BACnet',
        temperature: 24.0,
        humidity: 58.0,
        powerState: true,
        batteryLevel: 100,
        lastPingAt: new Date(),
        note: 'Tự động điều chỉnh công suất theo mật độ người đọc qua cảm biến hồng ngoại.',
      }),
      this.deviceRepo.create({
        deviceCode: 'SMART-LIGHT-FLOOR2',
        name: 'Bộ Điều Khiển Chiếu Sáng Thông Minh DALI - Tầng 2',
        type: IotDeviceType.SMART_LIGHT,
        location: 'Hành lang & Dãy kệ sách Kho Mở - Tầng 2',
        status: IotDeviceStatus.ONLINE,
        ipAddress: '192.168.10.150',
        macAddress: '70:B3:D5:E1:90:4B',
        firmwareVersion: 'v1.5.0-DALI',
        powerState: true,
        batteryLevel: 100,
        lastPingAt: new Date(),
        note: 'Tiết kiệm 45% điện năng nhờ tự động giảm sáng khi không có người trong dãy kệ.',
      }),
      this.deviceRepo.create({
        deviceCode: 'BOOK-DROP-247',
        name: 'Thùng Trả Sách Tự Động Thông Minh 24/7 Ngoài Cổng',
        type: IotDeviceType.BOOK_DROP_BOX,
        location: 'Mặt tiền Thư viện - Cổng phía Tây',
        status: IotDeviceStatus.ONLINE,
        ipAddress: '192.168.10.160',
        macAddress: 'AC:67:B2:FF:10:99',
        firmwareVersion: 'v2.8.1-DROPBOX',
        rfidScansToday: 95,
        powerState: true,
        batteryLevel: 100,
        lastPingAt: new Date(),
        note: 'Tích hợp đầu quét RFID nhận diện sách và băng tải tự động phân loại.',
      }),
    ];

    await this.deviceRepo.save(sampleDevices);
  }

  async findAll(type?: string, status?: string, search?: string) {
    const qb = this.deviceRepo.createQueryBuilder('dev');

    if (type) {
      qb.andWhere('dev.type = :type', { type });
    }
    if (status) {
      qb.andWhere('dev.status = :status', { status });
    }
    if (search) {
      qb.andWhere(
        '(LOWER(dev.name) LIKE LOWER(:search) OR LOWER(dev.deviceCode) LIKE LOWER(:search) OR LOWER(dev.location) LIKE LOWER(:search))',
        { search: `%${search}%` },
      );
    }

    qb.orderBy('dev.type', 'ASC').addOrderBy('dev.id', 'ASC');
    return qb.getMany();
  }

  async getStats() {
    const all = await this.deviceRepo.find();

    const total = all.length;
    const online = all.filter((d) => d.status === IotDeviceStatus.ONLINE).length;
    const warning = all.filter((d) => d.status === IotDeviceStatus.WARNING).length;
    const offline = all.filter(
      (d) => d.status === IotDeviceStatus.OFFLINE || d.status === IotDeviceStatus.MAINTENANCE,
    ).length;

    const rfidTotalScans = all.reduce((sum, d) => sum + (d.rfidScansToday || 0), 0);
    const rfidTotalAlerts = all.reduce((sum, d) => sum + (d.rfidAlertsToday || 0), 0);

    // Cảm biến môi trường kho sách quý
    const archiveSensor = all.find((d) => d.deviceCode === 'ENV-SENSOR-ARCHIVE');

    return {
      total,
      online,
      warning,
      offline,
      rfidTotalScans,
      rfidTotalAlerts,
      archiveEnvironment: {
        temperature: archiveSensor?.temperature || 21.0,
        humidity: archiveSensor?.humidity || 55.0,
        isSafe:
          archiveSensor &&
          archiveSensor.temperature >= 18 &&
          archiveSensor.temperature <= 24 &&
          archiveSensor.humidity >= 45 &&
          archiveSensor.humidity <= 65,
      },
    };
  }

  async findOne(id: number) {
    const device = await this.deviceRepo.findOne({ where: { id } });
    if (!device) {
      throw new NotFoundException(`Không tìm thấy thiết bị IoT #${id}`);
    }
    return device;
  }

  async create(dto: CreateIotDeviceDto) {
    const device = this.deviceRepo.create({
      ...dto,
      lastPingAt: new Date(),
    });
    return this.deviceRepo.save(device);
  }

  async update(id: number, dto: UpdateIotDeviceDto) {
    const device = await this.findOne(id);
    Object.assign(device, dto);
    device.lastPingAt = new Date();
    return this.deviceRepo.save(device);
  }

  async remove(id: number) {
    const device = await this.findOne(id);
    await this.deviceRepo.remove(device);
    return { success: true, message: `Đã xóa thiết bị IoT #${id}` };
  }

  async executeAction(id: number, actionDto: DeviceActionDto) {
    const device = await this.findOne(id);

    switch (actionDto.action) {
      case 'TOGGLE_POWER':
        device.powerState = !device.powerState;
        device.status = device.powerState ? IotDeviceStatus.ONLINE : IotDeviceStatus.OFFLINE;
        break;

      case 'TRIGGER_ALARM_TEST':
        device.rfidAlertsToday = (device.rfidAlertsToday || 0) + 1;
        break;

      case 'REBOOT':
        device.lastPingAt = new Date();
        device.status = IotDeviceStatus.ONLINE;
        break;

      case 'CALIBRATE':
        if (device.type === IotDeviceType.ENV_SENSOR) {
          device.temperature = 21.2;
          device.humidity = 54.0;
        }
        device.lastPingAt = new Date();
        break;
    }

    await this.deviceRepo.save(device);

    return {
      success: true,
      message: `Đã thực thi lệnh "${actionDto.action}" cho thiết bị [${device.deviceCode}] thành công!`,
      device,
    };
  }
}

