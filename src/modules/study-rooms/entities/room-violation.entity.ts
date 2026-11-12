import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

@Entity('room_violations')
export class RoomViolation {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User, { eager: true, onDelete: 'CASCADE' })
  user: User;

  @Column({ length: 255 })
  reason: string; // e.g. "Bỏ đặt phòng không check-in 3 lần", "Gây mất trật tự"

  @Column({ default: true })
  isBlocked: boolean;

  @Column({ type: 'date', nullable: true })
  blockedUntil: Date;

  @CreateDateColumn()
  createdAt: Date;
}

