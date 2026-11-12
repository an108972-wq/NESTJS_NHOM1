import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

export enum EventType {
  ANNOUNCEMENT = 'ANNOUNCEMENT',
  EXHIBITION = 'EXHIBITION',
  EVENT = 'EVENT',
  WORKSHOP = 'WORKSHOP',
}

export enum EventStatus {
  UPCOMING = 'UPCOMING',
  HAPPENING = 'HAPPENING',
  ENDED = 'ENDED',
  CANCELLED = 'CANCELLED',
}

export enum TargetAudience {
  ALL = 'ALL',
  STUDENT = 'STUDENT',
  LECTURER = 'LECTURER',
  RESEARCHER = 'RESEARCHER',
}

@Entity('library_events')
export class LibraryEvent {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  title: string;

  @Column({ type: 'varchar', length: 30, default: EventType.ANNOUNCEMENT })
  type: EventType;

  @Column({ type: 'text' })
  content: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  location?: string | null;

  @Column({ type: 'datetime', nullable: true })
  startDate?: Date | null;

  @Column({ type: 'datetime', nullable: true })
  endDate?: Date | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  bannerUrl?: string | null;

  @Column({ type: 'boolean', default: false })
  isPinned: boolean;

  @Column({ type: 'varchar', length: 30, default: TargetAudience.ALL })
  targetAudience: TargetAudience;

  @Column({ type: 'varchar', length: 30, default: EventStatus.UPCOMING })
  status: EventStatus;

  @Column({ type: 'int', default: 0 })
  viewCount: number;

  @Column({ type: 'varchar', length: 150, nullable: true })
  createdByName?: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

