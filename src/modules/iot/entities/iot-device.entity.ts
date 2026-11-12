import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum IotDeviceType {
  RFID_GATE = 'RFID_GATE',
  ENV_SENSOR = 'ENV_SENSOR',
  SMART_AC = 'SMART_AC',
  SMART_LIGHT = 'SMART_LIGHT',
  BOOK_DROP_BOX = 'BOOK_DROP_BOX',
}

export enum IotDeviceStatus {
  ONLINE = 'ONLINE',
  WARNING = 'WARNING',
  OFFLINE = 'OFFLINE',
  MAINTENANCE = 'MAINTENANCE',
}

@Entity('iot_devices')
export class IotDevice {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  deviceCode: string;

  @Column()
  name: string;

  @Column({
    type: 'varchar',
    default: IotDeviceType.ENV_SENSOR,
  })
  type: IotDeviceType;

  @Column()
  location: string;

  @Column({
    type: 'varchar',
    default: IotDeviceStatus.ONLINE,
  })
  status: IotDeviceStatus;

  @Column({ nullable: true })
  ipAddress: string;

  @Column({ nullable: true })
  macAddress: string;

  @Column({ nullable: true })
  firmwareVersion: string;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  temperature: number; // Nhiệt độ (°C)

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  humidity: number; // Độ ẩm không khí (%)

  @Column({ type: 'int', default: 0 })
  rfidScansToday: number; // Lượt thẻ / sách quét qua cổng RFID

  @Column({ type: 'int', default: 0 })
  rfidAlertsToday: number; // Cảnh báo tài liệu chưa mượn kích hoạt chuông

  @Column({ default: true })
  powerState: boolean; // Trạng thái Bật/Tắt nguồn

  @Column({ type: 'int', default: 100 })
  batteryLevel: number; // Mức pin (%)

  @Column({ type: 'datetime', nullable: true })
  lastPingAt: Date;

  @Column({ type: 'text', nullable: true })
  note: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

