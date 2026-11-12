import { Column, CreateDateColumn, Entity, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { TutorialRegistration } from './tutorial-registration.entity';

export enum TutorialCategory {
  SEARCH_GUIDE = 'SEARCH_GUIDE',
  POLICY_RULES = 'POLICY_RULES',
  DIGITAL_RESOURCES = 'DIGITAL_RESOURCES',
  WORKSHOP = 'WORKSHOP',
}

export enum TutorialFormat {
  VIDEO = 'VIDEO',
  PDF = 'PDF',
  ARTICLE = 'ARTICLE',
  WORKSHOP = 'WORKSHOP',
}

export enum TutorialStatus {
  ACTIVE = 'ACTIVE',
  UPCOMING = 'UPCOMING',
  ARCHIVED = 'ARCHIVED',
}

@Entity('library_tutorials')
export class LibraryTutorial {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  title: string;

  @Column({ type: 'varchar', length: 30, default: TutorialCategory.SEARCH_GUIDE })
  category: TutorialCategory;

  @Column({ type: 'varchar', length: 20, default: TutorialFormat.VIDEO })
  format: TutorialFormat;

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'varchar', length: 500 })
  contentUrl: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  thumbnailUrl?: string | null;

  @Column({ type: 'varchar', length: 150, nullable: true })
  instructor?: string | null;

  @Column({ type: 'int', nullable: true })
  durationMinutes?: number | null;

  @Column({ type: 'datetime', nullable: true })
  eventDate?: Date | null;

  @Column({ type: 'int', default: 50, nullable: true })
  maxSeats?: number | null;

  @Column({ type: 'int', default: 0 })
  registeredCount: number;

  @Column({ type: 'int', default: 0 })
  viewCount: number;

  @Column({ type: 'boolean', default: false })
  isFeatured: boolean;

  @Column({ type: 'varchar', length: 20, default: TutorialStatus.ACTIVE })
  status: TutorialStatus;

  @OneToMany(() => TutorialRegistration, (reg) => reg.tutorial, { cascade: true })
  registrations?: TutorialRegistration[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

