import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('audit_logs')
export class AuditLog {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 50 })
  action: string;

  @Column({ length: 50 })
  module: string;

  @Column({ length: 20, default: 'INFO' })
  level: string;

  @Column({ type: 'text' })
  description: string;

  @Column({ nullable: true })
  performerId?: number;

  @Column({ nullable: true, length: 150 })
  performerName?: string;

  @Column({ nullable: true, length: 50 })
  performerRole?: string;

  @Column({ nullable: true, length: 50 })
  ipAddress?: string;

  @CreateDateColumn()
  createdAt: Date;
}

