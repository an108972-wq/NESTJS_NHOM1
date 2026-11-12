import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { LockerAssignment } from './locker-assignment.entity';

export enum LockerStatus {
  VACANT = 'VACANT',
  IN_USE = 'IN_USE',
  DAMAGED = 'DAMAGED',
  MAINTENANCE = 'MAINTENANCE',
}

@Entity('lockers')
export class Locker {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true, length: 50 })
  lockerNumber: string; // e.g. "LK-A-01"

  @Column({ length: 100, default: 'Khu A - Tầng 1' })
  zone: string; // Khu vực: Tầng 1, Tầng 2, Sảnh chính

  @Column({ length: 50, default: 'Dãy A1' })
  cluster: string; // Dãy A1, Dãy B2

  @Column({
    type: 'enum',
    enum: LockerStatus,
    default: LockerStatus.VACANT,
  })
  status: LockerStatus;

  @Column({ length: 10, nullable: true })
  currentPin: string; // Mã PIN mở tủ

  @ManyToOne(() => User, { nullable: true, eager: true, onDelete: 'SET NULL' })
  currentUser: User;

  @OneToMany(() => LockerAssignment, (assign) => assign.locker)
  assignments: LockerAssignment[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

