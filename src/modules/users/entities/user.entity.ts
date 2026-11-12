import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { UserRole } from '../../../common/constants/user-role';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  username: string;

  @Column({ type: 'varchar', length: 150, nullable: true })
  fullName?: string | null;

  @Column({ type: 'varchar', length: 30, nullable: true })
  phone?: string | null;

  @Column()
  passwordHash: string;

  @Column({ type: 'varchar', length: 20, default: UserRole.READER })
  role: UserRole;

  @Column({ unique: true, nullable: true })
  email?: string;

  @Column({ default: true })
  isActive: boolean;

  @Column({ type: 'datetime', nullable: true })
  approvedAt?: Date | null;

  @Column({ type: 'int', default: 5 })
  maxActiveLoans: number;

  @Column({ type: 'varchar', length: 50, nullable: true })
  cardNumber?: string | null;

  @Column({ type: 'varchar', length: 30, default: 'STUDENT', nullable: true })
  readerGroup?: string | null;

  @Column({ type: 'text', nullable: true })
  customPermissions?: string | null;

  @Column({ type: 'date', nullable: true })
  libraryCardIssuedAt?: Date | null;

  @Column({ type: 'date', nullable: true })
  libraryCardExpiresAt?: Date | null;

  @Column({ nullable: true })
  currentHashedRefreshToken: string | null;

  @Column({ type: 'boolean', default: false })
  isTwoFactorEnabled: boolean;

  @Column({ type: 'varchar', length: 100, nullable: true })
  twoFactorTempCode?: string | null;

  @Column({ type: 'datetime', nullable: true })
  twoFactorCodeExpiresAt?: Date | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  passwordResetToken?: string | null;

  @Column({ type: 'datetime', nullable: true })
  passwordResetExpiresAt?: Date | null;

  @Column({ type: 'int', default: 0 })
  failedLoginAttempts: number;

  @Column({ type: 'datetime', nullable: true })
  lockoutUntil?: Date | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}