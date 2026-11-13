import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum IotAlertSeverity {
  INFO = 'INFO',
  WARNING = 'WARNING',
  CRITICAL = 'CRITICAL',
}

@Entity('iot_alerts')
export class IotAlert {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  deviceCode: string;

  @Column()
  deviceName: string;

  @Column()
  alertType: string; // OVER_TEMPERATURE, HIGH_HUMIDITY, RFID_UNAUTHORIZED, DEVICE_OFFLINE, BATTERY_LOW

  @Column({
    type: 'varchar',
    default: IotAlertSeverity.WARNING,
  })
  severity: IotAlertSeverity;

  @Column({ type: 'text' })
  message: string;

  @Column({ default: false })
  resolved: boolean;

  @Column({ type: 'datetime', nullable: true })
  resolvedAt: Date;

  @Column({ nullable: true })
  resolvedByStaffName: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

