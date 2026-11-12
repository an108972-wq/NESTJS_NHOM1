import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
} from 'typeorm';
import { Device } from './device.entity';

@Entity('device_maintenances')
export class DeviceMaintenance {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Device, (device) => device.maintenances, { eager: true, onDelete: 'CASCADE' })
  device: Device;

  @Column({ length: 150 })
  title: string;

  @Column({ length: 50, default: 'PERIODIC' })
  maintenanceType: string; // PERIODIC, REPAIR, INSPECTION

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  cost: number;

  @Column({ type: 'date' })
  scheduledDate: Date;

  @Column({ type: 'date', nullable: true })
  completedDate: Date;

  @Column({ nullable: true, length: 100 })
  technician: string;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @CreateDateColumn()
  createdAt: Date;
}

