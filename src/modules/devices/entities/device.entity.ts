import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { DeviceLoan } from './device-loan.entity';
import { DeviceMaintenance } from './device-maintenance.entity';

export enum DeviceStatus {
  AVAILABLE = 'AVAILABLE',
  BORROWED = 'BORROWED',
  MAINTENANCE = 'MAINTENANCE',
  DAMAGED = 'DAMAGED',
}

export enum DeviceCategory {
  LAPTOP = 'LAPTOP',
  TABLET = 'TABLET',
  VR_HEADSET = 'VR_HEADSET',
  PROJECTOR = 'PROJECTOR',
  ACCESSORY = 'ACCESSORY',
  OTHER = 'OTHER',
}

@Entity('devices')
export class Device {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true, length: 50 })
  code: string;

  @Column({ length: 150 })
  name: string;

  @Column({
    type: 'enum',
    enum: DeviceCategory,
    default: DeviceCategory.LAPTOP,
  })
  category: DeviceCategory;

  @Column({ nullable: true, length: 100 })
  serialNumber: string;

  @Column({ type: 'text', nullable: true })
  specs: string;

  @Column({
    type: 'enum',
    enum: DeviceStatus,
    default: DeviceStatus.AVAILABLE,
  })
  status: DeviceStatus;

  @Column({ nullable: true, length: 255 })
  accessories: string; // e.g. "Củ sạc, Cáp HDMI, Túi chống sốc"

  @Column({ nullable: true, length: 150 })
  location: string; // e.g. "Phòng Media Tầng 2 - Tủ A1"

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  hourlyFineRate: number; // Tiền phạt trễ hạn mỗi giờ

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  purchaseCost: number;

  @OneToMany(() => DeviceLoan, (loan) => loan.device)
  loans: DeviceLoan[];

  @OneToMany(() => DeviceMaintenance, (maintenance) => maintenance.device)
  maintenances: DeviceMaintenance[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

